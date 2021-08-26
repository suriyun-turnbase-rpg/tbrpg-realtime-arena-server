import { Room, Client } from "colyseus";
import { Dispatcher } from "@colyseus/command";
import { ERoomState } from "./enums/ERoomState";
import { GameRoomState } from "./schema/GameRoomState";
import * as Commands from "./GameCommand";

export class GameRoom extends Room<GameRoomState> {
  dispatcher = new Dispatcher(this);
  password: string = "";
  currentRoomState: number = ERoomState.WaitPlayersToReady;
  currentRoomCountDown: number = 0;

  onCreate (options: any) {
    // It's 1 vs 1 battle game, so it can have only 2 clients
    const hasPassword: boolean = options.password && options.password.length > 0;
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
    console.log("room " + options.title + " created, has password? " + hasPassword);
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  onJoin (client: Client, options: any) {
    // TODO: validate access token
    if (this.password != options.password) {
      // reject because password is wrong
      console.log(client.sessionId, "rejected! (wrong password)");
      throw new Error("rejected! (wrong password)");
    }
    this.dispatcher.dispatch(new Commands.OnJoinCommand(), {
      sessionId: client.sessionId,
    });
    console.log(client.sessionId, "joined!");
  }

  onLeave (client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
    this.broadcast("playerLeave", client.sessionId);
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
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
      case ERoomState.Battle:
        this.updateBattle(deltaTime);
        break;
    }
  }

  onStateChange(state: number) {
    switch (state) {
      case ERoomState.CountDownToStartGame:
        // Five seconds to start game
        this.currentRoomCountDown = 5000;
        break;
      case ERoomState.Battle:
        // Game started, find player to start first turn
        break;
    }
  }

  updateBattle(deltaTime: number) {

  }
}
