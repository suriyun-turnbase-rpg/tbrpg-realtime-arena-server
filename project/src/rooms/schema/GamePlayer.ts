import { Schema, type } from "@colyseus/schema";
import { EPlayerState } from "../enums/EPlayerState";

export class GamePlayer extends Schema {
  @type("string")
  sessionId: string = "";

  @type("string")
  id: string = "";

  @type("string")
  profileName: string = "Player Name";

  @type("int32")
  exp: number = 1;

  @type("int32")
  teamBP: number = 0;

  @type("string")
  mainCharacter: string = "";

  @type("int32")
  mainCharacterExp: number = 1;

  @type("uint8")
  team: number = 0;

  @type("uint8")
  state: number = EPlayerState.None;
}
