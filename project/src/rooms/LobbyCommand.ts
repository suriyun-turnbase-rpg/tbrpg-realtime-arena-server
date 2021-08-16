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
        // Change player ready state
        const player = this.state.players.get(client.sessionId);
        player.isReady = !player.isReady;
        this.state.players.set(client.sessionId, player);
        // Check if all players ready all not
        let playersReady = true;
        this.state.players.forEach((value: LobbyPlayer, key: string, map: Map<string, LobbyPlayer>) => {
            if (!value.isReady) {
                playersReady = false;
            }
        });
        // Players are ready?, count down to start game
        if (playersReady) {
            if (!this.state.isStarting)
                this.state.isStarting = true;
        } else {
            if (this.state.isStarting)
                this.state.isStarting = false;
        }
    }
}