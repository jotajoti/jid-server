
export class ServerPush {
    constructor(io) {
        this._io = io;
    }

    stats(stats) {
        this._io.sockets.emit('stats', stats);
    }
}
