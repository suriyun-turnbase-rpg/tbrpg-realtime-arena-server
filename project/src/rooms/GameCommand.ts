import { Client } from "colyseus";
import { Command } from "@colyseus/command";
import { EPlayerState } from "./enums/EPlayerState";
import { ERoomState } from "./enums/ERoomState";
import { GamePlayer } from "./schema/GamePlayer";
import { GameRoomState } from "./schema/GameRoomState";

export class OnJoinCommand extends Command<GameRoomState, {
    sessionId: string,
    player: any,
    teamSortDesc: boolean,
}> {
    execute({ sessionId, player, teamSortDesc } = this.payload) {
        const newPlayer = new GamePlayer().assign({
            sessionId: sessionId,
            id: String(player.id),
            profileName: player.profileName,
            exp: player.exp,
            mainCharacter: player.mainCharacter,
            mainCharacterExp: player.mainCharacterExp,
        });
        // Set new player data
        this.state.players.set(sessionId, newPlayer);

        // Sorting players
        const players: Array<GamePlayer> = [];
        this.state.players.forEach((value: GamePlayer, key: string, map: Map<string, GamePlayer>) => {
            // Simple assign player's team, 0 = A, 1 = B
            players.push(value);
        });
        // Set team by sorting userId
        players.sort((a, b) => {
            if(a.id < b.id) { return teamSortDesc ? 1 : -1; }
            if(a.id > b.id) { return teamSortDesc ? -1 : 1; }
            return 0;
        });
        // Set team
        let team: number = 0;
        for (let i = 0; i < players.length; ++i) {
            const player = players[i];
            player.team = team++;
            this.state.players.set(player.id, player);
        }
    }
}

export class OnToggleReadyCommand extends Command<GameRoomState, {
    client: Client
}> {
    execute({ client } = this.payload) {
        // Not allow to toggle ready state if game state >= wait players to enter game
        if (this.state.state >= ERoomState.WaitPlayersToEnterGame) {
            return;
        }
        if (!this.state.players.has(client.sessionId)) {
            return;
        }
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
                if (value.state < EPlayerState.Ready) {
                    playersReady = false;
                }
            });
            // Players are ready?, count down to start game
            if (playersReady) {
                this.state.state = ERoomState.CountDownToStartGame;
            } else {
                this.state.state = ERoomState.WaitPlayersToReady;
            }
        }
    }
}

export class OnEnterGameCommand extends Command<GameRoomState, {
    client: Client
}> {
    execute({ client } = this.payload) {
        // Not allow to enter game state if game state < wait players to enter game
        if (this.state.state < ERoomState.WaitPlayersToEnterGame) {
            return;
        }
        if (!this.state.players.has(client.sessionId)) {
            return;
        }
        // Change player in-game state
        const player = this.state.players.get(client.sessionId);
        if (player.state < EPlayerState.InGame) {
            player.state = EPlayerState.InGame;
        }
        this.state.players.set(client.sessionId, player);
        // Check if all players are in game
        if (this.state.players.size >= 2 && !this.state.managerSessionId) {
            // Session manager can be switched later.
            let managerSessionId = client.sessionId;
            let playersInGame = true;
            this.state.players.forEach((value: GamePlayer, key: string, map: Map<string, GamePlayer>) => {
                if (value.state < EPlayerState.InGame) {
                    managerSessionId = "";
                    playersInGame = false;
                }
            });
            // Players are in game?, game started
            if (playersInGame) {
                this.state.managerSessionId = managerSessionId;
                this.state.state = ERoomState.Battle;
                console.log(`State changed to Battle, manager session ID: ${managerSessionId}`);
            }
        }
    }
}