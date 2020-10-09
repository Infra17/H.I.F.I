let divSelectRoom=document.getElementById("selectRoom")
let divConsultingRoom=document.getElementById("conferenceRoom")
let inputRoomNumber=document.getElementById("roomNumber")
let btnGoRoom=document.getElementById("Go")
let localVideo=document.getElementById("localVideo")
let remoteVideo=document.getElementById("remoteVideo")
let h2CallName=document.getElementById("callName")
let inputCallName=document.getElementById("inputCallName")
let btnSetName=document.getElementById("setName")

let roomNumber,localStream,rtcPeerConnection,isCaller,dataChannel
localVideo.muted=true;
const iceServers={
    'iceServer':[
        {'urls':'stun:stun.services.mozilla.com'},
        {'urls':'stun:stun.l.google.com:19302'}
    ]
}
const streamConstraints ={
    audio:true,
    video: true
}

const socket=io()


btnGoRoom.onclick=()=>{
    if(inputRoomNumber.value===''){
        alert("please enter a room name")
    }else {
        roomNumber=inputRoomNumber.value
        socket.emit('Create or join',roomNumber)
        divSelectRoom.style="display:none"
        divConsultingRoom.style="display:block"
    }
}

btnSetName.onclick=()=>{
    if(inputCallName.value===''){
        alert("please enter a name")
    }else {
        dataChannel.send(inputCallName.value)
        h2CallName.innerText=inputCallName.value

    }
}

socket.on('created',room=>{
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream=>{
            localStream=stream
            localVideo.srcObject=stream
            isCaller=true
        })
        .catch(err=>{
            console.log("Error ocurred",err)
        })
})

socket.on('joined',room=>{
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream=>{
            localStream=stream
            localVideo.srcObject=stream
            socket.emit('ready',roomNumber)
        })
        .catch(err=>{
            console.log("Error ocurred",err)
        })
})

socket.on('ready',()=>{
    if(isCaller){
        rtcPeerConnection=new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate=onIceCandidate
        rtcPeerConnection.ontrack=onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0],localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1],localStream)
        rtcPeerConnection.createOffer()
        .then(sessionDescription=>{
            rtcPeerConnection.setLocalDescription(sessionDescription)
            socket.emit('offer',{
                type:'offer',
                sdp: sessionDescription,
                room: roomNumber
            })
        })
        .catch(err=>{
            console.log(err)
        })
        dataChannel=rtcPeerConnection.createDataChannel(roomNumber)
        dataChannel.onmessage=event=>{h2CallName.innerText=event.data}
    }
})

socket.on('offer',(event)=>{
    if(!isCaller){
        rtcPeerConnection=new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate=onIceCandidate
        rtcPeerConnection.ontrack=onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0],localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1],localStream)
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
        rtcPeerConnection.createAnswer()
        .then(sessionDescription=>{
            rtcPeerConnection.setLocalDescription(sessionDescription)
            socket.emit('answer',{
                type:'answer',
                sdp: sessionDescription,
                room: roomNumber
            })
        })
        .catch(err=>{
            console.log(err)
        })
        rtcPeerConnection.ondatachannel=event=>{
            dataChannel=event.channel
            dataChannel.onmessage=event=>{h2CallName.innerText=event.data}
        }
    }
})

socket.on('answer',event=>{
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('candidate',event=>{
    const candidate=new RTCIceCandidate({
        sdpMLineIndex:event.label,
        candidate:event.candidate
    })
    console.log('received ',candidate)
    rtcPeerConnection.addIceCandidate(candidate)
})


function onAddStream(event){
    remoteVideo.srcObject=event.streams[0]
    remoteStream=event.streams[0]
}




function onIceCandidate(event){
    if(event.candidate){
    console.log('sending ice candidate',event.candidate)
    socket.emit('candidate',{
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id:event.candidate.sdpMid,
        candidate: event.candidate.candidate,
        room:roomNumber
    })
}
}