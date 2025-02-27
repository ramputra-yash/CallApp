const socket = io();

let local;
let remote;
let peerConnection;

const rtcSettings = {
    iceServer: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}

const initialize = async () => {

    socket.on('signalingMessage', handleSignalingMessage);

    local = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    initiateOffer();
}

const initiateOffer = async () => {
    await createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('signalingMessage', JSON.stringify({type: "offer", offer: offer}));
}

const createPeerConnection = async () => {
    peerConnection = new RTCPeerConnection(rtcSettings);

    remote = new MediaStream();
    document.querySelector('#remote').srcObject = remote;
    document.querySelector('#local').srcObject = local;

    local.getTracks().forEach(track => {
        peerConnection.addTrack(track, local);
    });

    peerConnection.ontrack = (event) => event.streams[0].getTracks().forEach(track => {
        remote.addTrack(track);
    })

    peerConnection.onicecandidate = (event) => {
        event.candidate && socket.emit('signalingMessage', JSON.stringify({type: "candidate", candidate: event.candidate}));
    }

}

const handleSignalingMessage = (message) => {
    const {type, offer, answer, candidate} = JSON.parse(message);

    if(type === "offer") handleOffer(offer);
    if(type === "answer") handleAnswer(answer);
    if(type === "candidate" && peerConnection) {
        peerConnection.addIceCandidate(candidate);
    }
}

const handleOffer = async (offer) => {
    await createPeerConnection();
    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('signalingMessage', JSON.stringify({type: "answer", answer: answer}));

}

const handleAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
}

initialize();