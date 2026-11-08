import { host, $ } from "../_shared/runtime.js";
let stream=null;
function stop(){if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}}
export async function open(){
  stop();
  await host.show("camera",`<section class="camera-app"><div class="camera-stage"><video id="cameraVideo" autoplay playsinline></video><div class="camera-placeholder" id="cameraPlaceholder"><i class="ri-camera-line"></i><strong>Camera preview</strong><span>Allow camera access to begin.</span></div></div><div class="camera-controls"><button class="primary-button" id="cameraStart"><i class="ri-camera-line"></i> Start camera</button><button id="cameraCapture" disabled><i class="ri-circle-fill"></i> Capture</button><button id="cameraStop" disabled><i class="ri-stop-circle-line"></i> Stop</button></div><p class="camera-note">Camera access stays in this browser tab. Captures are saved to Files.</p></section>`,{afterRender(){
    const video=$("#cameraVideo"),placeholder=$("#cameraPlaceholder"),start=$("#cameraStart"),capture=$("#cameraCapture"),stopButton=$("#cameraStop");
    start.onclick=async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});video.srcObject=stream;placeholder.hidden=true;capture.disabled=false;stopButton.disabled=false;}catch(error){host.notify("Camera unavailable",error.message||"Camera permission was not granted.");}};
    capture.onclick=()=>{if(!video.videoWidth)return;const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext("2d").drawImage(video,0,0);canvas.toBlob(async blob=>{if(!blob)return;const file=new File([blob],`SecuOS-Capture-${Date.now()}.png`,{type:"image/png"});await window.SecuFileSystem.addFiles([file],"Images");host.notify("Photo saved","Your capture is now in Files and Gallery.");},"image/png");};
    stopButton.onclick=()=>{stop();video.srcObject=null;placeholder.hidden=false;capture.disabled=true;stopButton.disabled=true;};
  }});
  $("#appWindow")?.addEventListener("click",event=>{if(event.target.closest("[data-window-close]"))stop();},{once:true});
}
