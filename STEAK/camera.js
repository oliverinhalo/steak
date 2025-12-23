// camera.js - open camera, capture photo, upload to /upload
(function () {
  const openBtn = document.getElementById('open-camera');
  const flipBtn = document.getElementById('flip-camera');
  const captureBtn = document.getElementById('capture');
  const closeBtn = document.getElementById('close-camera');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const statusDiv = document.getElementById('upload-status');
  const fileInput = document.getElementById('file');
  let stream = null;

  async function openCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      await video.play();
      video.style.display = 'block';
      captureBtn.style.display = 'inline-block';
      closeBtn.style.display = 'inline-block';
      openBtn.style.display = 'none';
      flipBtn.style.display = 'inline-block';
      statusDiv.textContent = '';
    } catch (err) {
      console.error('Camera open failed', err);
      statusDiv.style.color = 'red';
      statusDiv.textContent = 'Cannot access camera: ' + (err.message || err);
    }
  }

  function closeCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    video.style.display = 'none';
    captureBtn.style.display = 'none';
    closeBtn.style.display = 'none';
    openBtn.style.display = 'inline-block';
    flipBtn.style.display = 'none';
  }

  async function uploadBlob(blob, filenameHint) {
    const fd = new FormData();
    const name = filenameHint || 'photo.jpg';
    fd.append('photo', blob, name);
    statusDiv.style.color = 'black';
    statusDiv.textContent = 'Uploading...';
    try {
      const res = await fetch('/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(res.statusText || res.status);
      const data = await res.json();
      window.lastUploadedFilename = data.filename;
      statusDiv.style.color = 'green';
      statusDiv.textContent = 'Uploaded';
      // show uploaded image in preview and close camera
      const preview = document.getElementById('preview-img');
      if(preview){ preview.src = `/uploads/${data.filename}`; preview.style.display = 'block'; }
      closeCamera();
      return data;
    } catch (err) {
      console.error('Upload error', err);
      statusDiv.style.color = 'red';
      statusDiv.textContent = 'Upload error: ' + (err.message || err);
      throw err;
    }
  }

  function captureAndUpload() {
    if (!stream) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        statusDiv.style.color = 'red';
        statusDiv.textContent = 'Capture failed (no blob).';
        return;
      }
      try {
        await uploadBlob(blob, 'capture.jpg');
      } catch (e) {
        // handled in uploadBlob
      }
    }, 'image/jpeg', 0.95);
  }

  async function fileSelectedUpload() {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const f = fileInput.files[0];
    // If user already uploaded via camera, skip unless they changed the file
    statusDiv.style.color = 'black';
    statusDiv.textContent = 'Uploading selected file...';
    try {
      await uploadBlob(f, f.name);
    } catch (e) {
      // error already shown
    }
  }

  // Attach listeners if elements exist
  if (openBtn) openBtn.addEventListener('click', openCamera);
  if (flipBtn) flipBtn.addEventListener('click', async () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
  });
  if (captureBtn) captureBtn.addEventListener('click', captureAndUpload);
  if (closeBtn) closeBtn.addEventListener('click', closeCamera);
  if (fileInput) fileInput.addEventListener('change', fileSelectedUpload);

  window.addEventListener('beforeunload', () => { if (stream) stream.getTracks().forEach(t => t.stop()); });
})();
