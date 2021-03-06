const Peer = window.Peer;
var room_id;

function wait_sleep() {
  return new Promise(resolve => {
    
    var timer =setInterval(()=>{
        if (peer.open){
          resolve();
          clearInterval(timer);
        }
      },200);
  })
}
function wait_sleep_second() {
  return new Promise(resolve => {
    var timer =setInterval(()=>{
          resolve();
          clearInterval(timer);
      },1000);
  })
}

function get_roomId(){
  if( 1 < window.location.search.length ){
      var query = window.location.search.substring( 1 );
      var parameters = query.split( '&' );
      if( parameters.length>1){console.log('toomany parameter of GET');}
      else{
          var parameter=parameters[0].split('=');
          var paramName=decodeURIComponent(parameter[0]);
          var paramValue=decodeURIComponent(parameter[1]);
          if(paramName=='roomid'){
            room_id=paramValue;
            return room_id;
          }
      }
  }
};

async function main() {
  // const localVideo = document.getElementById('js-local-stream');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const messages = document.getElementById('js-messages');
  const audioMuteTriger = document.getElementById('audio_mute_trigger');
  const videoMuteTriger = document.getElementById('video_mute_trigger');

  var count_stream=-1;
  const num_person = 4;
  const person_array=[];
  for (  var i = 1;  i <= num_person;  i++  ) {
    person_array.push(document.getElementById('person'+i));
   }
  console.log(person_array);

  room_id=get_roomId();

  const getRoomModeByHash = 'sfu';

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  console.log('your id is gotten',yourid);
  // Render local stream
  // localVideo.muted = true;
  // localVideo.srcObject = localStream;
  // localVideo.playsInline = true;
  // await localVideo.play().catch(console.error);
  
  person_array[yourid-1].muted = true;
  person_array[yourid-1].srcObject = localStream;
  person_array[yourid-1].playsInline = true;
  await person_array[yourid-1].play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 1,
  }));

  // join
  // Note that you need to ensure the peer has connected to signaling server
  // before using methods of peer instance.
  wait_sleep().then(result => {
    console.log("show streams",peer.open);
    if (!peer.open) {
      console.log("peer is not open");
      return;
    }

    const room = peer.joinRoom(room_id, {
      mode: getRoomModeByHash,
      stream: localStream,
    });
    
    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });
    

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      count_stream++;
      if (count_stream%num_person==yourid-1){count_stream++;}
      count_stream=count_stream%num_person;
      console.log('count_stream:',count_stream);
      person_array[count_stream].srcObject = stream;
      person_array[count_stream].playsInline = true;
      person_array[count_stream].setAttribute('data-peer-id', stream.peerId);
      await person_array[count_stream].play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
    });

    // for closing room members
    room.on('peerLeave', close_room_members);

    function close_room_members(peerId){
      const remoteVideo = person_array.filter(function(value, index, array ) {
        if (value.getAttribute('data-peer-id')==peerId && index!=yourid-1){
          return value;
        }
      })[0];
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      messages.textContent += `=== ${peerId} left ===\n`;
    }


    // for closing myself
    room.once('close', close_myself);

    function close_myself(){
      messages.textContent += '== You left ===\n';
      var person_array_remote=person_array.filter(function(value, index, array ) {
        if (value.srcObject!=null){
          return value;
        }
      });
      person_array_remote.forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.cc = null;
      });
      // console.log(person_array_remote);
      // Array.from(person_array_remote).forEach(remoteVideo => {
      //   remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      //   remoteVideo.srcObject = null;
      //   remoteVideo.remove();
      // });
    }

    function audio_toggle(){
      localStream.getAudioTracks().forEach((track) => {
        if (track.enabled){
          track.enabled = false;
          console.log('audio off')
          audioMuteTriger.textContent="ミュート解除"
        }
        else{
          track.enabled = true;
          console.log('audio on')
          audioMuteTriger.textContent="ミュート"
        }
      });
    }

    function video_toggle(){
      localStream.getVideoTracks().forEach((track) => {
        if (track.enabled){
          track.enabled = false;
          console.log('video off');
          videoMuteTriger.textContent="ビデオの開始"
        }
        else{
          track.enabled = true;
          console.log('video on');
          videoMuteTriger.textContent="ビデオの停止"
        }
      });
    }

    socket.on('disconnected',()=>{
      console.log('socket disconnection is detected in skyway.js');
      socket.removeAllListeners('disconnected');
      room.close();
      close_myself();
      main();
      // wait_and_reset(5,1);
      // wait_sleep_second().then(result => {
        // main();
      // });
  });

    audioMuteTriger.addEventListener('click', audio_toggle); // 音声のミュート切り替え
    videoMuteTriger.addEventListener('click', video_toggle); // ビデオのオンオフ切り替え
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });
  });

  peer.on('error', console.error);
};
main();
