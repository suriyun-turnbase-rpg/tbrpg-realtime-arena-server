import { Client } from "colyseus";
import { Command } from "@colyseus/command";
import { GamePlayer } from "./schema/GamePlayer";
import { GameRoomState } from "./schema/GameRoomState";

export class OnJoinCommand extends Command<GameRoomState, {
    sessionId: string
}> {
    execute({ sessionId } = this.payload) {
        this.state.players.set(sessionId, new GamePlayer());
    }
}

export class OnToggleReadyCommand extends Command<GameRoomState, {
    client: Client
}> {
    execute({ client } = this.payload) {
        // Change player ready state
        const player = this.state.players.get(client.sessionId);
        player.isReady = !player.isReady;
        this.state.players.set(client.sessionId, player);
        // Check if all players ready all not
        if (this.state.players.size >= 2) {
            let playersReady = true;
            this.state.players.forEach((value: GamePlayer, key: string, map: Map<string, GamePlayer>) => {
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
}