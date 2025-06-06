/* eslint-env browser */

// SPDX-FileCopyrightText: 2023 The Pion community <https://pion.ly>
// SPDX-License-Identifier: MIT

const log = msg => {
    document.getElementById('logs').innerHTML += msg + '<br>'
  }
  
  window.createSession = isPublisher => {
     const pc = new RTCPeerConnection({
       iceServers: [
         {
           urls: 'stun:stun.l.google.com:19302'
         },
        //  {urls:"turn:global.relay.metered.ca:80",username:"e7c2418ad54a28c683cde02e",credential:"ui+6iGFVbG7OlBIP"}
       ]
     })
//    const pc = new RTCPeerConnection({})

    let sendChannel = pc.createDataChannel('Joystick-signal-reciever2')
    sendChannel.onclose = () => console.log('sendChannel has closed')
    sendChannel.onopen = () => console.log('sendChannel has opened')
    sendChannel.onmessage = e => {
    // // const data = JSON.parse(msg.data);
    // // const now = Date.now();
    // // const latency = now - data.timestamp;
    // // console.log(`Frame ${data.frameId} latency: ${latency} ms`);

    //   console.log(`Message from DataChannel '${sendChannel}' payload '${e}'`);
    //   const decoder = new TextDecoder("utf-8");
    //   const text = decoder.decode(e.data);
    //   const data = JSON.parse(text);
    //   const now = Date.now();
    //   const latency = now - data.timestamp;
    //   console.log(`Frame ${data.frameId} latency: ${latency} ms`);
    //   // console.log(text, Date.now()); // e.g., "Button up pressed"

    //   log(`Message from DataChannel '${sendChannel.label}' payload '${text}'`)
// ---------------------------------------------------------------------------------------------------
    // const buffer = e.data;

    // // Make sure it's an ArrayBuffer
    // if (!(buffer instanceof ArrayBuffer)) {
    //   console.warn("Received non-binary message");
    //   return;
    // }
  
    // const view = new DataView(buffer);
  
    // // Extract frameId (4 bytes at offset 0)
    // const frameId = view.getUint32(0);
  
    // // Extract timestamp (8 bytes at offset 4)
    // const timestamp = Number(view.getBigUint64(4));
  
    // // Extract the simulated video payload (rest of the buffer)
    // const payload = new Uint8Array(buffer, 12); // 12-byte header
  
    // console.log("Received frame", {
    //   frameId,
    //   timestamp,
    //   payloadLength: payload.length,
    //   latency: Date.now() - timestamp
    // });
  // ---------------------------------------------------------------------------------------------------------
      const buffer = e.data;

// Make sure it's an ArrayBuffer
if (!(buffer instanceof ArrayBuffer)) {
  console.warn("Received non-binary message");
  return;
}

const view = new DataView(buffer);

// Extract frameId (4 bytes at offset 0)
const frameId = view.getUint32(0);

// Extract client1 timestamp (8 bytes at offset 4)
const client2Timestamp = Number(view.getBigUint64(4));

// Extract sfu1 timestamp (8 bytes before last 8)
const sfu2Timestamp = Number(view.getBigUint64(buffer.byteLength - 16));

// Extract sfu2 timestamp (last 8 bytes)
const sfu1Timestamp = Number(view.getBigUint64(buffer.byteLength - 8));

// Extract the simulated video payload
const payload = new Uint8Array(buffer, 12, buffer.byteLength - 12 - 16); // Exclude 12 header + 16 trailer bytes

// Current timestamp at client2
const client1Timestamp = Date.now();

// Compute latencies
const latencyClient2ToClient1 = client1Timestamp - client2Timestamp;
// const latencySFU1ToClient2 = sfu1Timestamp - client2Timestamp ;
const latencySFU1ToClient1 = client1Timestamp - sfu1Timestamp;
const latencyClient2ToSFU2 = sfu2Timestamp - client2Timestamp;
const latencySFU2ToSFU1 = sfu1Timestamp - sfu2Timestamp;

console.log("Received frame", {
  frameId,
  latencyClient2ToClient1,
  latencySFU1ToClient1,
  latencyClient2ToSFU2,
  latencySFU2ToSFU1,
  client1Timestamp,
  sfu1Timestamp,
  sfu2Timestamp,
  client2Timestamp,
  payloadLength: payload.length,
});

}
    pc.oniceconnectionstatechange = e => log(pc.iceConnectionState)
    pc.onicecandidate = event => {
      if (event.candidate === null) {
        document.getElementById('localSessionDescription').value = btoa(JSON.stringify(pc.localDescription))
        console.log(pc.localDescription);

        fetch('https://webrtc.hopto.org:8080/offer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/text' },
          body: btoa(JSON.stringify(pc.localDescription))
      })
      .then(response => response.text())
      .then(encodedAnswer => {
          console.log('Received answer:', encodedAnswer);
  
          document.getElementById('remoteSessionDescription').value = encodedAnswer
          window.startSession()
      })
      .catch(error => console.error('Error:', error));
      }
    }


  
    if (isPublisher) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          stream.getTracks().forEach(track => pc.addTrack(track, stream))
          document.getElementById('video1').srcObject = stream
          pc.createOffer()
            .then(d => {
              pc.setLocalDescription(d)
              console.log("localdescription set");
              
            })
            .catch(log)
        }).catch(log)
    } else {
      pc.addTransceiver('video')
      pc.createOffer()
        .then(d => pc.setLocalDescription(d))
        .catch(log)
  
      pc.ontrack = function (event) {
        const el = document.getElementById('video1')
        el.srcObject = event.streams[0]
        el.autoplay = true
        el.controls = true
      }
    }
  
    window.startSession = () => {
      const sd = document.getElementById('remoteSessionDescription').value
      if (sd === '') {
        return alert('Session Description must not be empty')
      }
  
      try {
        pc.setRemoteDescription(JSON.parse(atob(sd)))
      } catch (e) {
        alert(e)
      }
    }
  
    window.copySDP = () => {
      const browserSDP = document.getElementById('localSessionDescription')
  
      browserSDP.focus()
      browserSDP.select()
  
      try {
        const successful = document.execCommand('copy')
        const msg = successful ? 'successful' : 'unsuccessful'
        log('Copying SDP was ' + msg)
      } catch (err) {
        log('Unable to copy SDP ' + err)
      }
    }
  
    const btns = document.getElementsByClassName('createSessionButton')
    for (let i = 0; i < btns.length; i++) {
      btns[i].style = 'display: none'
    }
  
    document.getElementById('signalingContainer').style = 'display: block'
  }
