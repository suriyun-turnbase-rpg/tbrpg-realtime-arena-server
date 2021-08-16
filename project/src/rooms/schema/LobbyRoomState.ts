import { Schema, MapSchema, type } from "@colyseus/schema";
import { LobbyPlayer } from "./LobbyPlayer"

export class LobbyRoomState extends Schema {
  @type({ map: LobbyPlayer }) 
  players = new MapSchema<LobbyPlayer>();

  @type("boolean")
  isStarting: boolean = false;
}
