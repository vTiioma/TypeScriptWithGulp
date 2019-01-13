class Game extends Phaser.Game {
    constructor(config: GameConfig) {
        super(config);
    }
}

window.onload = () => {
    var game = new Game({
        width: 800,
        height: 600,
        type: Phaser.AUTO,
        parent: 'game',
        backgroundColor: "#2d2d2d",
        scene: Boot
    });
}
