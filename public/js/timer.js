
class GameTimeEmulator {
    constructor(row){
        this.row = row;
        this.seconds = 0;
        row._timer = this;
        this.reset();
    }

    reset(){
        this.stop();
        this.seconds = moment.duration(this.row.today_time).as('seconds');
        return this;
    }

    start() {
        this._timer = setInterval(() => {
            this.seconds++;

            let d = moment.duration(this.seconds, 's').as('ms');
            let hours = Math.floor(moment.duration(d).as('hours'));
            let ms = moment(d).format("mm:ss");

            this.row.today_time = `${hours}:${ms}`

        }, 1000);
        return this;
    }

    stop() {
        clearInterval(this._timer);
        return this;
    }

    static get (row){
        return row._timer ? row._timer : new GameTimeEmulator(row);
    }
}