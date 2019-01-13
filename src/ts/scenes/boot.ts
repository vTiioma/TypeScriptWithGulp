class Boot extends Phaser.Scene {
    private blocks: Phaser.GameObjects.Group = new Phaser.GameObjects.Group(this);

    constructor() {
    super({ key: "Boot" });
    }

    preload(): void {
        this.load.image('block', './img/50x50.png');
    }

    create(): void {
        this.blocks = new Phaser.GameObjects.Group(this, {
            key: 'block',
            repeat: 107,
            setScale: { x: 0.3, y: 0.3 }
        });
        
        Phaser.Actions.GridAlign(this.blocks.getChildren(), {
            width: 12,
            height: 10,
            cellWidth: 60,
            cellHeight: 60,
            x: 70,
            y: 60
        });

        let i = 0;

        this.blocks.children.iterate((child: Phaser.GameObjects.GameObject) => {
            this.tweens.add({
                targets: child,
                scaleX: 1,
                scaleY: 1,
                ease: 'Sine.easeInOut',
                duration: 300,
                delay: i * 50,
                repeat: -1,
                yoyo: true
            });

            i++;

            if (i % 12 === 0) {
                i = 0;
            }
        }, this);
    }
}

class TweenLite extends gsap.TweenLite {}
class TimelineMax extends gsap.TimelineMax {}

const tween: TimelineMax = new TimelineMax();