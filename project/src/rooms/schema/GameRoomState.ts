import { Schema, MapSchema, type } from "@colyseus/schema";
import { GamePlayer } from "./GamePlayer"

export class GameRoomState extends Schema {
  @type({ map: GamePlayer }) 
  players = new MapSchema<GamePlayer>();

  @type("boolean")
  isStarting: boolean = false;
}
