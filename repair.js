
const WIDTH = 1280;
const HEIGHT = 720;

const NUMTHINGS = 5;
const THING_WIDTH = 100;
const DECAY_SPEED = 0.1;
const MAT_WIDTH = 50;
const MAT_HEIGHT = 20;
const MAT_SPEED = 300;
const OBS_RADIUS = 8;
const OBS_SPEED = 30;
const OBS_AALEN = Math.sqrt(OBS_RADIUS*OBS_RADIUS*2);
const OBS_NUM = 40;
const OBS_ACCEL = 1/60;

var colors = [
    "#F22",
    "#2F2",
    "#22F",
    "#FF2",
    "#2FF",
];

var newstate = null;


function RequestFullscreen(target) {
    let el = target || document.body;
    let d = document;
    let requestMethod = el.requestFullscreen || el.webkitRequestFullscreen 
        || el.mozRequestFullScreen || el.msRequestFullscreen || el.oRequestFullscreen;
    let fullscreenElement = document.fullscreenElement || d.webkitFullscreenElement
        || d.mozFullScreenElement || d.msFullscreenElement;
    // let cancelMethod = d.exitFullscreen || d.webkitExitFullscreen
    //     || d.mozCancelFullScreen || d.msExitFullscreen;

    if (fullscreenElement) {
        // I don't want to toggle.
        // if (cancelMethod) {
        //     cancelMethod.call(d);
        // }
    } else {
        if (requestMethod) {
            // Native full screen.
            requestMethod.call(el);
        }
    }
}

function mouse2canvas(x, y, ...rest)
{
    let r = WIDTH/canvas.offsetWidth;
    return [x*r, y*r, ...rest];
}

function resize(x, y) {
    let cr = WIDTH/HEIGHT;
    let wr = window.innerWidth/window.innerHeight;
    if (cr > wr) {
        canvas.style.width = "100%";
        canvas.style.height = "auto";
    } else {
        canvas.style.width = "auto";
        canvas.style.height = "100%";
    }
}

// Ahhh if only there was a library that implements this somewhere
function leftpad(s, n, z) {
    z = z || "0";
    while (s.length < n) {
        s = z + s;
    }
    return s;
}

function formatTime(t) {
    return leftpad(""+Math.floor(t/60),2) + ":" + leftpad(""+Math.floor(t % 60), 2);
}

class GameState {    
    constructor() {
        this.time = 0;

        this.machines = [];
        for (let i = 0; i < NUMTHINGS; i++) {
            this.machines.push(1);
        }
        this.nmachines = NUMTHINGS;

        this.obstacles = [];
        for (let i = 0; i < OBS_NUM; i++) {
            let o = this.spawnObstacle();
            this.obstacles.push(o);
        }

        this.fillMatBag();        

        this.decaySpeed = DECAY_SPEED;
        this.awake = false;
        this.gameOver = 0;
        this.mat = this.spawnMat();
    }

    fillMatBag() {
        this.matbag = []
        for (let i = 0; i < this.machines.length; i++) {
            if (this.machines[i] > 0) {
                this.matbag.push(i);
            }
        }
    }

    spawnObstacle(o) {
        let x = Math.random()*(WIDTH-THING_WIDTH-MAT_WIDTH) + THING_WIDTH;
        let y = Math.random()*HEIGHT;
        let t = Math.random()*0.5 + 0.5;
        let d = (Math.random() >= 0.5)? 1 : -1;
        return {x, y, t, d, ...o};
    }

    spawnMat() {
        if (this.matbag.length == 0) {
            this.fillMatBag();
        }
        let choice = -1;
        let min = 1;
        for (let i = 0; i < this.matbag.length; i++) {
            let nmachine = this.matbag[i];
            let decay = this.machines[nmachine];
            if (decay > 0 && min > decay) {
                min = decay;
                choice = i;
            }
        }
        if (choice >= 0) {
            choice = this.matbag.splice(choice, 1)[0];
        } else {
            choice = Math.floor(Math.random()*this.nmachines);
            this.fillMatBag();
        }
        let x = WIDTH - MAT_WIDTH;
        let y = Math.random()*(HEIGHT-MAT_HEIGHT);
        return {x, y, n: choice};
    }

    checkMachineDecay(i) {
        if (this.machines[i] < 0) {
            this.decaySpeed *= 1.1;
            this.nmachines--;
            if (this.nmachines <= 0) {
                this.gameOver = 4;
            }
            if (this.mat.n == i) {
                this.mat = this.spawnMat();
                this.awake = false;
            }
        }

    }

    tick(dt) {
        // Move obstacles
        let ospeed = OBS_SPEED*(1+this.time*OBS_ACCEL);
        for (let i = 0; i < this.obstacles.length; i++) {
            let o = this.obstacles[i];
            o.x += dt*o.d*ospeed/2;
            o.y += dt*ospeed;
            if (o.y >= HEIGHT || o.x < THING_WIDTH || o.x >= (WIDTH-MAT_WIDTH)) {
                o = this.spawnObstacle({y: 0});
            }
            o.t -= dt;
            if (o.t <= 0) {
                o = this.spawnObstacle({x:o.x, y:o.y});
            }
            this.obstacles[i] = o;

            // Check collision against the material block
            if (this.awake) {
                let dx = this.mat.x+MAT_WIDTH/2 - o.x;
                let dy = this.mat.y+MAT_HEIGHT/2 - o.y;
                if (Math.sqrt(dx*dx + dy*dy) < (MAT_HEIGHT+OBS_RADIUS/2)) {
                    this.machines[this.mat.n] -= 0.2; // Damage the target machine
                    this.checkMachineDecay(this.mat.n);
                    this.awake = false;
                    this.mat = this.spawnMat();
                }
            }
        }

        if (this.gameOver <= 0 && this.awake) {
            this.time += dt;

            // Decay machines
            let decay = this.decaySpeed / this.nmachines;
            for (let i = 0; i < this.machines.length; i++) {
                if (this.machines[i] >= 0) {
                    this.machines[i] -= dt*decay*(0.9+0.2*Math.random());
                    this.checkMachineDecay(i);
                }
            }
            // Move material
            let dx = this.target.x - (this.mat.x+MAT_WIDTH/2);
            let dy = this.target.y - (this.mat.y+MAT_HEIGHT/2);
            let d = Math.sqrt(dx*dx + dy*dy);
            if (d > 0.0001) {
                this.mat.x += MAT_SPEED*dx/d*dt;
                this.mat.y += MAT_SPEED*dy/d*dt;
            }
            // If reached the machines, check it's the correct one
            if (this.mat.x < THING_WIDTH) {
                let mh = HEIGHT/this.machines.length;
                let my0 = Math.floor(this.mat.n*mh);
                let my1 = Math.floor((this.mat.n+1)*mh);
                if (this.mat.y < my1 && (this.mat.y+MAT_HEIGHT) >= my0) {
                    this.machines[this.mat.n] = Math.min(1, this.machines[this.mat.n] + 0.5);
                }
                this.awake = false;
                this.mat = this.spawnMat();
            }
        }

        if (this.gameOver > 0) {
            this.gameOver -= dt;
            if (this.gameOver <= 0) {
                newstate = new MenuState();
            }
        }
    }

    render() {
        ctx.fillStyle = "#031";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let o of this.obstacles) {
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(o.x, o.y, OBS_RADIUS, 0, 2*Math.PI);
            ctx.fill();
        }

        let mh = HEIGHT/this.machines.length;
        for (let i = 0; i < this.machines.length; i++) {
            if (this.machines[i] >= 0) {
                let y0 = Math.floor(i*mh);
                let y1 = Math.floor((i+1)*mh);
                ctx.fillStyle = "#000";
                ctx.fillRect(0, y0, THING_WIDTH, y1-y0);
                ctx.fillStyle = colors[i];
                ctx.fillRect(0, y0, THING_WIDTH*this.machines[i], y1-y0);
            }
        }

        ctx.fillStyle = colors[this.mat.n];
        ctx.fillRect(this.mat.x, this.mat.y, MAT_WIDTH, MAT_HEIGHT);

        ctx.fillStyle = "#FFF";
        ctx.textAlign = "center";
        ctx.font = "60px Arial";
        ctx.fillText(formatTime(this.time), canvas.width/2, 60);

        if (this.gameOver > 0) {
            ctx.fillStyle = "#F36";
            ctx.textAlign = "center";
            ctx.font = "140px Arial";
            ctx.fillText("Game Over", canvas.width/2, canvas.height/2);
        }
    }

    mousemove(x, y, pressed) {
        this.target = {x, y};
        if (x >= this.mat.x-MAT_WIDTH && y >= this.mat.y-MAT_HEIGHT && y < (this.mat.y+MAT_HEIGHT*2)) {
            this.awake = true;
        }
    }

}

class MenuState {
    constructor() {
    }

    render() {
        ctx.fillStyle = "#013";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFF";
        ctx.textAlign = "center";
        ctx.font = "140px Arial";
        ctx.fillText("Repair", canvas.width/2, canvas.height/4);
        ctx.font = "35px Arial";
        ctx.fillText("A Global Game Jam 2020 quick entry", canvas.width/2, canvas.height/4+200);
        ctx.fillText("by Javier Arevalo", canvas.width/2, canvas.height/4+235);
    }

    click() {
        RequestFullscreen()
        newstate = new GameState();
    }
}

// Minimal state engine
function main()
{
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = null;

    window.addEventListener('resize', () => { resize(); if (state && state.resize) state.resize()});
    canvas.addEventListener('click', (e) => { if (state && state.click) state.click.apply(state, mouse2canvas(e.offsetX, e.offsetY))});
    // canvas.addEventListener('mousedown', (e) => { if (state && state.mousedown) state.mousedown.apply(state, mouse2canvas(e.offsetX, e.offsetY))});
    // canvas.addEventListener('mouseup', (e) => { if (state && state.mouseup) state.mouseup.apply(state, mouse2canvas(e.offsetX, e.offsetY))});
    canvas.addEventListener('mousemove', (e) =>{ if (state && state.mousemove) state.mousemove.apply(state, mouse2canvas(e.offsetX, e.offsetY, e.buttons != 0))});
    // canvas.addEventListener('touchstart', (e) => { if (state && state.mousedown) state.mousedown.apply(state, mouse2canvas(e.changedTouches[0].clientX, e.changedTouches[0].clientY))});
    // canvas.addEventListener('touchend', (e) => { if (state && state.mouseup) state.mouseup.apply(state, mouse2canvas(e.changedTouches[0].clientX, e.changedTouches[0].clientY))});
    canvas.addEventListener('touchmove', (e) => {
        if (state && state.mousemove) {
            state.mousemove.apply(state, mouse2canvas(e.changedTouches[0].clientX, e.changedTouches[0].clientY, true));
        }
        e.preventDefault();
        e.stopPropagation();
    });

    let prevTime = 0;
    function tick()
    {
        requestAnimationFrame(tick);
        if (newstate && newstate != state)
        {
            if (state && state.onexit) state.onexit();
            state = null;
            if (newstate && newstate.onenter) newstate.onenter();
            state = newstate;
            newstate = null;
        }
        let ct = Date.now();
        let dt = (prevTime == 0)? 0 : (ct - prevTime);
        prevTime = (prevTime == 0)? ct : prevTime + dt;
        let dts = Math.min(0.033, dt/1000); // Limit frame to 30Hz, easier breakpointing
        if (state && state.tick) state.tick(dts);
        if (state && state.render) state.render(dts);
    }
    
    newstate = new MenuState();
    resize();
    tick();
}
