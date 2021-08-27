import { Schema, type } from "@colyseus/schema";
import { EPlayerState } from "../enums/EPlayerState";

export class GamePlayer extends Schema {
  @type("string")
  playerName: string = "Player Name";

  @type("int32")
  playerLevel: number = 1;

  @type("int32")
  teamBP: number = 0;

  @type("string")
  leaderCharacterId: string = "";

  @type("int32")
  leaderCharacterLevel: number = 1;

  @type("uint8")
  team: number = 0;

  @type("uint8")
  state: number = EPlayerState.None;
}
