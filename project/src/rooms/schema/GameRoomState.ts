import { Schema, MapSchema, type } from "@colyseus/schema";
import { ERoomState } from "../enums/ERoomState";
import { GamePlayer } from "./GamePlayer"

export class GameRoomState extends Schema {
  @type({ map: GamePlayer }) 
  players = new MapSchema<GamePlayer>();

  @type("uint8")
  state: number = ERoomState.WaitPlayersToReady;
}
