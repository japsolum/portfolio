var minX = 0; //Minimum travesable location on x axis
var minY = 57; //Minimum traversable area on y axis (does not include water blocks as that will result in winning the game)
var maxX = 505; //Maximum travesable area on x axis 
var maxY = 386; //Maximum traversable area on y axis
var pStartLocX = 205; //Starting location of player on x axis
var pStartLocY = 385; //Strating location of player on y axis
var eStartLocX = -100; //Starting location of enemy on x Axis
var eStartLocY1 = 57; //Starting location of enemy on y Axis for first line
var eStartLocY2 = 139; //Starting location of enemy on y Axis for second line
var eStartLocY3 = 221; //Starting location of enemy on y Axis for third line
var winCounter = 0;//Keeps track of how many times in a row you've won
var gotKey = false;//Keeps track of if you have grabbed the key or not
    
// Enemies our player must avoid 
var Enemy = function(speed, yCord) {
    this.sprite = 'images/enemy-bug.png';
    this.speed = speed;
    this.location = {
        "x" : eStartLocX,
        "y" : yCord
    };
};

// Update the enemy's position
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function(dt) {
    this.location.x += this.speed * dt;
    if (this.location.x > (maxX + 100)) {
        this.location.x = eStartLocX;
    } else {
        ctx.drawImage(Resources.get(this.sprite), this.location.x, this.location.y);
    }
};

// Draw the enemy on the screen
Enemy.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.location.x, this.location.y);
};

// Creates class for player
var Player = function() {
    this.sprite = 'images/char-boy.png';
    this.location = {
        "x" : pStartLocX,
        "y" : pStartLocY
    };
};

//Draws player on screen
Player.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.location.x, this.location.y);
};

Player.prototype.update = function() {
    detectCollision();
    ctx.drawImage(Resources.get(this.sprite), this.location.x, this.location.y);
};

//Moves player by one space as long as it will not result in running off the edge.
Player.prototype.handleInput = function(key) {
    if (key === "left") {
        if ((this.location.x - 100) > minX) {
            this.location.x -= 100;
        }
    }else if(key === "right") {
        if ((this.location.x + 100) < maxX) {
            this.location.x += 100;
        }
    }else if (key === "up") {
        if ((this.location.y - 82) >= minY) {
            this.location.y -= 82;    
        }else {
            if (gotKey) {
                win();
            }
        }
        
    }else if (key === "down") {
        if ((this.location.y + 82) < maxY) {
            this.location.y += 82;    
        }
    }
};

//Creates a key object
var Key = function() {
    this.sprite = 'images/Key.png';
    this.location = {
        "x" : 405,
        "y" : 139
    };
};

Key.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.location.x, this.location.y);
};

//Moves key off screen once collected so it seems to disappear
Key.prototype.disappear = function() {
    this.location.x = -100;
    this.location.y = -100;
};

//Moves key back into view once hit by enemy or game is won
Key.prototype.reappear = function() {
        this.location.x = 405;
        this.location.y = 139;
};

//Updates key image
Key.prototype.update = function() {
    ctx.drawImage(Resources.get(this.sprite), this.location.x, this.location.y);
};

// Initiates player, key, and enemies
var goldKey = new Key();
var player = new Player();
var enemy1 = new Enemy(50, eStartLocY1);
var enemy2 = new Enemy(150, eStartLocY1); 
var enemy3 = new Enemy(200, eStartLocY2); 
var enemy4 = new Enemy(100, eStartLocY2); 
var enemy5 = new Enemy(150, eStartLocY3);
var allEnemies = [enemy1, enemy2, enemy3, enemy4, enemy5];

//Function that detects collision between enemy or key and player.
function detectCollision() {
    for (var i = 0; i < allEnemies.length; i++) {
        //Determines if enemy and player are touching
        var touchE = (((allEnemies[i].location.x - player.location.x < 100) && (allEnemies[i].location.x - player.location.x > -85)) && (allEnemies[i].location.y === player.location.y)); 
        //Determines if player has touched the key
        var touchK = (player.location.x === goldKey.location.x) && (player.location.y === goldKey.location.y);

        if (touchE) {
            winCounter = 0;
            gotKey = false;
            goldKey.reappear();
            document.getElementById("noOfWins").innerHTML = winCounter;
            player.location.x = pStartLocX;
            player.location.y = pStartLocY;
        }

        if (touchK) {
            goldKey.disappear();
            gotKey = true;
        }


    }
}

// Decides what to do when you win the game.
function win() {
    winCounter += 1;
    gotKey = false;
    goldKey.reappear();
    document.getElementById("noOfWins").innerHTML = winCounter;
    player.location.x = pStartLocX;
    player.location.y = pStartLocY;
}
// This listens for key presses and sends the keys to the
// Player.handleInput() method. 
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
    };

    player.handleInput(allowedKeys[e.keyCode]);
});
