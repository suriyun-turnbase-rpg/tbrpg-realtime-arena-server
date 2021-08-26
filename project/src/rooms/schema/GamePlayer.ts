import { Schema, type } from "@colyseus/schema";

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

  @type("boolean")
  isReady: boolean = false;
}
