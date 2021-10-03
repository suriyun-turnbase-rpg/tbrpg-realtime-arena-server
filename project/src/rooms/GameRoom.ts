import { Room, Client } from "colyseus";
import { Dispatcher } from "@colyseus/command";
import { ERoomState } from "./enums/ERoomState";
import { GamePlayer } from "./schema/GamePlayer";
import { GameRoomState } from "./schema/GameRoomState";
import * as Commands from "./GameCommand";
import * as ArenaConfig from "../arena.config";
import * as axios from "axios";

export class GameRoom extends Room<GameRoomState> {
  dispatcher = new Dispatcher(this);
  password: string = "";
  currentRoomState: number = ERoomState.WaitPlayersToReady;
  currentRoomCountDown: number = 0;
  playerIds: Array<string> = [];
  gameplayState: any;
  waitForPlayerAction: boolean = false;

  onCreate(options: any) {
    // It's 1 vs 1 battle game, so it can have only 2 clients
    const hasPassword: boolean = (options.password && options.password.length > 0) ? true : false;
    this.maxClients = 2;
    this.password = options.password;
    this.setState(new GameRoomState());
    this.setMetadata({
      title: options.title,
      hasPassword: hasPassword,
    });
    this.onMessage("ready", (client) => {
      this.dispatcher.dispatch(new Commands.OnToggleReadyCommand(), {
        client: client,
      });
    });
    this.onMessage("enterGame", (client) => {
      if (this.state.state == ERoomState.Battle) {
        // Battle already started, send characters to the client which is just entering the game
        client.send("updateGameplayState", this.gameplayState);
      }
      this.dispatcher.dispatch(new Commands.OnEnterGameCommand(), {
        client: client,
      });
    });
    this.onMessage("updateActiveCharacter", (client, id) => {
      if (this.state.state != ERoomState.Battle) return;
      if (client.sessionId != this.state.managerSessionId) return;
      this.waitForPlayerAction = true;
      this.broadcast("updateActiveCharacter", id);
    });
    this.onMessage("updateGameplayState", (client, data) => {
      if (this.state.state != ERoomState.Battle) return;
      if (client.sessionId != this.state.managerSessionId) return;
      // Store data in-case players are going to re-login, server will send characters data to the client
      this.gameplayState = data;
      this.broadcast("updateGameplayState", data);
      // Has a winner, may store winner/loser battle record here
      if (data.winnerSessionId || data.loserSessionId) {
        this.state.state = ERoomState.End;
        // Find winner session and do something to winner player
        if (this.state.players.has(data.winnerSessionId)) {
          ArenaConfig.onPlayerWin(this.state.players.get(data.winnerSessionId).id);
        }
        // Find loser session and do something to loser player
        if (this.state.players.has(data.loserSessionId)) {
          ArenaConfig.onPlayerWin(this.state.players.get(data.loserSessionId).id);
        }
      }
    });
    this.onMessage("doSelectedAction", (client, data) => {
      if (this.state.state != ERoomState.Battle) return;
      if (!this.waitForPlayerAction) return;
      this.waitForPlayerAction = false;
      this.broadcast("doSelectedAction", data);
    });
    console.log(`Room ${options.title} created, has password? ${hasPassword}`);
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  async onJoin(client: Client, options: any) {
    if (this.password != options.password) {
      // reject because room's password is wrong
      console.log(`${client.sessionId} rejected! (wrong password)`);
      throw new Error("Rejected! (wrong password)");
    }

    // User validating
    let responseData: any;
    const serviceUrl = process.env.SERVICE_URL;
    await axios.default.post(`${serviceUrl}/validate-login-token?loginToken=${options.loginToken}`, {
      refreshToken: false,
    }, {
      headers: { 'Authorization': `Bearer ${options.loginToken}` }
    }).then(function (response: any) {
      responseData = response.data;
    }).catch(function (error: string) {
      // handle error
      console.log(`Cannot validate login token: ${error}`);
      throw new Error(`Rejected! (${error})`);
    });

    if (responseData.error) {
      // reject because error occuring
      console.log(`${client.sessionId} rejected! (${responseData.error})`);
      throw new Error(`Rejected! (${responseData.error})`);
    }

    const userId: string = String(responseData.player.id);
    let foundUser: boolean = false;
    // Find that the player is already in the room or not?
    this.state.players.forEach((value: GamePlayer, key: string, map: Map<string, GamePlayer>) => {
      if (value.id === userId) {
        foundUser = true;
      }
    });
    if (foundUser) {
      console.log(`${client.sessionId} rejected! (player is already in the room)`);
      throw new Error("Rejected! (player is already in the room)");
    }

    // Find that the player is allowed to battle or not?
    foundUser = false;
    for (let i = 0; i < this.playerIds.length; ++i) {
      if (this.playerIds[i] === userId) {
        foundUser = true;
        break;
      }
    }

    if (this.state.state < ERoomState.WaitPlayersToEnterGame) {
      // Store user's ID, to determine that this player is allowed to battle
      if (!foundUser) {
        this.playerIds.push(userId);
      }
    } else {
      if (!foundUser) {
        console.log(`${client.sessionId} rejected! (player is not allowed to battle)`);
        throw new Error("Rejected! (player is not allowed to battle)");
      }
    }

    // Store player to the room state
    this.dispatcher.dispatch(new Commands.OnJoinCommand(), {
      sessionId: client.sessionId,
      player: responseData.player,
    });
    console.log(`${client.sessionId} joined!`);
  }

  onLeave(client: Client, consented: boolean) {
    // Unassign player by user ID
    if (this.state.state < ERoomState.WaitPlayersToEnterGame && this.state.players.has(client.sessionId)) {
      for (let i = this.playerIds.length - 1; i >= 0; --i) {
        if (this.playerIds[i] === this.state.players.get(client.sessionId).id) {
          this.playerIds.splice(i, 1);
          break;
        }
      }
      this.state.state = ERoomState.WaitPlayersToReady;
    }
    this.state.players.delete(client.sessionId);
    this.broadcast("playerLeave", client.sessionId);
    if (client.sessionId == this.state.managerSessionId) {
      // Change manager to another
      this.state.managerSessionId = undefined;
      this.state.players.forEach((value: GamePlayer, key: string, map: Map<string, GamePlayer>) => {
        if (!this.state.managerSessionId && key != client.sessionId) {
          this.state.managerSessionId = key;
        }
      });
    }
    console.log(`${client.sessionId} left!, manager session ID switched to ${this.state.managerSessionId}`);
  }

  onDispose() {
    console.log(`Room ${this.roomId} disposing...`);
    this.dispatcher.stop();
  }

  update(deltaTime: number) {
    if (this.currentRoomState != this.state.state) {
      this.currentRoomState = this.state.state;
      this.onStateChange(this.state.state);
    }
    switch (this.state.state) {
      case ERoomState.CountDownToStartGame:
        this.currentRoomCountDown -= deltaTime;
        if (this.currentRoomCountDown <= 0) {
          this.state.state = ERoomState.WaitPlayersToEnterGame;
        }
        break;
    }
  }

  onStateChange(state: number) {
    switch (state) {
      case ERoomState.CountDownToStartGame:
        // Five seconds to start game
        this.currentRoomCountDown = Number(process.env.DURATION_TO_START_GAME);
        break;
    }
  }
}
