import './app.scss';
import {Orchestra} from './orchestra';
import anime from 'animejs/lib/anime.es.js';

export const orchestra = new Orchestra('localhost:2525/api', false);

//Default volume of the twitch player. This is what we will restore to.
let defaultVolume = 0;
let embed = null;

//Set the embed
orchestra.fetchCurrentChannel().then(async (channel) => {

    //https://webpack.js.org/plugins/environment-plugin/#dotenvplugin
    //Create the embed
    embed = new Twitch.Embed("twitch-embed", {
        channel: channel,
        layout: "video",
        height: "100%",
        width: "100%"
    });

    //Hook into the change event
    orchestra.on('ORCHESTRA_CHANGE', async (event) => {
        //Close the screen
        await screenDown();

        //Change the channel, once it starts playing, opent he screen again
        embed.setChannel(event.name);
        embed.addEventListener(Twitch.Embed.VIDEO_PLAY, async () => { await screenUp() }, { once: true });
    });
    
});

export async function screenDown() {

    //Snap to the start
    anime.set('.transition .tile', {
        height: '0%',
        top: "0%",
    });

    //Animate the volume going to 0
    defaultVolume = embed.getVolume();
    let volume = { value: defaultVolume };

    //Get the sound element and play it
    const sound = document.getElementById('audio-woosh');
    sound.play(); 

    //Animate
    //Show transition
    await anime({    
        targets: '.transition .tile',
        height: '100%',
        top: "0%",
        delay: anime.stagger(100),
        easing: 'easeInOutQuad'
    }).finished;

    //Make volume go bye bye
    await anime({    
        targets: volume,
        value: 0,
        easing: 'easeOutExpo',
        update: () => { embed.setVolume(volume.value); }
    }).finished;
}

export async function screenUp() {

    //Snap to position
    anime.set('.transition .tile', {
        height: '100%',
        top: "0%",
    });

    //unduck the audio
    let volume = { value: 0 };
    let unduckTask = anime({ 
        targets: volume,
        value: defaultVolume,
        easing: 'easeInExpo',
        update: () => { embed.setVolume(volume.value); }
    }).finished;

    //Play the sound effect
    const sound = document.getElementById('audio-woosh-reverse');
    sound.play(); 

    //Make the squares go bye bye
    await anime({
        targets: '.transition .tile',
        height: "100%",
        top: "100%",
        delay: anime.stagger(100),
        easing: 'easeInOutQuad'
    }).finished;

    //Finally, make sure the unduck is finished.
    await unduckTask;
}