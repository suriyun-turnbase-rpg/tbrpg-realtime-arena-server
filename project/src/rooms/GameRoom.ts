import { Room, Client } from "colyseus";
import { Dispatcher } from "@colyseus/command";
import { ERoomState } from "./enums/ERoomState";
import { GamePlayer } from "./schema/GamePlayer";
import { GameRoomState } from "./schema/GameRoomState";
import * as Commands from "./GameCommand";
import * as axios from "axios";

export class GameRoom extends Room<GameRoomState> {
  dispatcher = new Dispatcher(this);
  password: string = "";
  currentRoomState: number = ERoomState.WaitPlayersToReady;
  currentRoomCountDown: number = 0;
  playerLoginTokens: { [key: string]: string } = {};

  onCreate (options: any) {
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
      this.dispatcher.dispatch(new Commands.OnEnterGameCommand(), {
        client: client,
      });
    });
    this.onMessage("updateActiveCharacter", (client, id) => {
      if (this.state.state != ERoomState.Battle) return;
      if (client.sessionId != this.state.managerSessionId) return;
      this.broadcast("updateActiveCharacter", id);
    });
    this.onMessage("doSelectedAction", (client, data) => {
      if (this.state.state != ERoomState.Battle) return;
      this.broadcast("doSelectedAction", data);
    });
    console.log("room " + options.title + " created, has password? " + hasPassword);
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  onJoin (client: Client, options: any) {
    const password = this.password;
    const dispatcher = this.dispatcher;
    const playerLoginTokens = this.playerLoginTokens;
    const serviceUrl = process.env.SERVICE_URL;
    axios.default.post(serviceUrl + "/validate-login-token?loginToken=" + options.loginToken, {
        refreshToken: false,
      }, {
        headers: {'Authorization': "Bearer " + options.loginToken}
      })
      .then(function(response: any) {
        if (password != options.password) {
          // reject because password is wrong
          console.log(client.sessionId + " rejected! (wrong password)");
          throw new Error("rejected! (wrong password)");
        }
        if (response.data.error) {
          // reject because error occuring
          console.log(client.sessionId + " rejected! (" + response.data.error + ")");
          throw new Error("rejected! (" + response.data.error + ")");
        }
        // Store player login token, it will being used for web-service validation
        playerLoginTokens[client.sessionId] = options.loginToken;
        // Store player to the room state
        dispatcher.dispatch(new Commands.OnJoinCommand(), {
          sessionId: client.sessionId,
          player: response.data.player,
        });
        console.log(client.sessionId + " joined!");
      })
      .catch(function(error: string) {
        // handle error
        console.log("Cannot validate login token: " + error);
        throw new Error("rejected! (" + error + ")");
      });
  }

  onLeave (client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
    this.broadcast("playerLeave", client.sessionId);
    if (client.sessionId == this.state.managerSessionId) {
      // Change manager to another
      this.state.players.forEach((value: GamePlayer, key: string, map: Map<string, GamePlayer>) => {
          this.state.managerSessionId = key
      });
    }
    console.log(client.sessionId + " left!");
  }

  onDispose() {
    console.log("room " + this.roomId + " disposing...");
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
        this.currentRoomCountDown = 5000;
        break;
    }
  }
}
