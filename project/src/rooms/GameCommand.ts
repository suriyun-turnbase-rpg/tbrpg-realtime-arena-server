import { Client } from "colyseus";
import { Command } from "@colyseus/command";
import { EPlayerState } from "./enums/EPlayerState";
import { ERoomState } from "./enums/ERoomState";
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
        if (player.state < EPlayerState.Ready) {
            player.state = EPlayerState.Ready;
        } else {
            player.state = EPlayerState.None;
        }
        this.state.players.set(client.sessionId, player);
        // Check if all players ready all not
        if (this.state.players.size >= 2) {
            let playersReady = true;
            this.state.players.forEach((value: GamePlayer, key: string, map: Map<string, GamePlayer>) => {
                if (player.state < EPlayerState.Ready) {
                    playersReady = false;
                }
            });
            // Players are ready?, count down to start game
            if (playersReady) {
                if (this.state.state < ERoomState.CountDownToStartGame)
                    this.state.state = ERoomState.CountDownToStartGame;
            } else {
                if (this.state.state < ERoomState.WaitPlayersToEnterGame)
                    this.state.state = ERoomState.WaitPlayersToReady;
            }
        }
    }
}