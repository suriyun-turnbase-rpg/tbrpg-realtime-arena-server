import { Room, Client } from "colyseus";
import { Dispatcher } from "@colyseus/command";
import { LobbyRoomState } from "./schema/LobbyRoomState";

export class LobbyRoom extends Room<LobbyRoomState> {
  dispatcher = new Dispatcher(this);
  password: string = "";

  onCreate (options: any) {
    this.maxClients = 2;
    this.password = options.password;
    this.setState(new LobbyRoomState());
    this.setMetadata({
      title: options.title,
      hasPassword: options.password && options.password.length > 0
    });
    console.log("room " + options.title + " created with password " + options.password);
  }

  onJoin (client: Client, options: any) {
    // TODO: validate access token
    if (this.password != options.password) {
      // reject because password is wrong
      console.log(client.sessionId, "rejected! (wrong password)");
      throw new Error("rejected! (wrong password)");
    }
    console.log(client.sessionId, "joined!");
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
    this.dispatcher.stop();
  }
}
