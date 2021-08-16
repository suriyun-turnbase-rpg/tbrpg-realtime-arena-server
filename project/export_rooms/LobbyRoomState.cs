// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 1.0.26
// 

using Colyseus.Schema;

public partial class LobbyRoomState : Schema {
	[Type(0, "map", typeof(MapSchema<LobbyPlayer>))]
	public MapSchema<LobbyPlayer> players = new MapSchema<LobbyPlayer>();

	[Type(1, "string")]
	public string title = default(string);

	[Type(2, "boolean")]
	public bool hasPassword = default(bool);
}

