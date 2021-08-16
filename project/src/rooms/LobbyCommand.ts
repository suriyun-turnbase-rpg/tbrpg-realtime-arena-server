import { Client } from "colyseus";
import { Command } from "@colyseus/command";
import { LobbyPlayer } from "./schema/LobbyPlayer";
import { LobbyRoomState } from "./schema/LobbyRoomState";

export class OnJoinCommand extends Command<LobbyRoomState, {
    sessionId: string
}> {
  execute({ sessionId } = this.payload) {
    this.state.players.set(sessionId, new LobbyPlayer());
  }
}

export class OnToggleReadyCommand extends Command<LobbyRoomState, {
    client: Client
}> {
    execute({ client } = this.payload) {
      const player = this.state.players.get(client.sessionId);
      player.isReady = !player.isReady;
      this.state.players.set(client.sessionId, player);
    }
}