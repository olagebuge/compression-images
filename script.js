let stepCount = 1;

document
  .getElementById("add-step")
  .addEventListener("click", function () {
    stepCount++;

    const newStep = document.createElement("div");
    newStep.classList.add("step");
    newStep.id = `step-${stepCount}`;
    newStep.innerHTML = `
      <div class="action-setting">
        <label for="step-action">Step ${stepCount}</label>
        <select id="step-action">
          <option value="resize">等比縮放</option>
          <option value="crop">裁切</option>
        </select>
        <select id="according">
          <option value="according-width">依據寬</option>
          <option value="according-height">依據高</option>
        </select>
        <select id="crop-from" class="hidden">
            <option value="from-height">裁掉上下</option>
            <option value="from-width">裁掉左右</option>
            <option value="from-up">裁掉下方</option>
            <option value="from-bottom">裁掉上方</option>
            <option value="from-right">裁掉右邊</option>
            <option value="from-left">裁掉左邊</option>
        </select>
      </div>
        <div class="action-setting">
          <label for="action-value">––數值(px)</label>
          <input type="number" id="step-size" placeholder="例:600" />
        </div>
         <span class="deleteBtn">刪除</span>`;

    // 將新步驟插入步驟區域
    document
      .querySelector(".steps").appendChild(newStep);

    // 為新步驟的刪除按鈕添加事件監聽
    newStep
      .querySelector(".deleteBtn")
      .addEventListener("click", function () {
        newStep.remove(); // 刪除該步驟
        updateStepNumbers(); // 刪除後更新步驟編號
      });
  });



// 更新步驟編號和stepCount
function updateStepNumbers() {
  const steps = document.querySelectorAll(".step");
  stepCount = steps.length; // 更新stepCount為當前步驟數量

  steps.forEach((step, index) => {
    const stepLabel = step.querySelector("label[for='step-action']");
    stepLabel.textContent = `Step ${index + 1}`; // 更新步驟標籤
    step.id = `step-${index + 1}`; // 更新步驟的ID
  });
}


// 監聽 "確認送出" 按鈕點擊事件
document.querySelector(".comfirm-btn").addEventListener("click", async function () {
  const confirmBtn = document.querySelector(".comfirm-btn");
  const originalBtnText = confirmBtn.textContent;
  const fileInput = document.getElementById("upload-file");
  const qualityCheckbox = document.getElementById("lower-quality").checked;
  const qualityValue = document.getElementById("lower-quality-value").value;
  const convertToJpgCheckbox = document.getElementById("convert-to-jpg").checked;
  const allSteps = document.querySelectorAll(".step");

  if (fileInput.files.length > 0) {
    const files = fileInput.files;
    const zip = new JSZip();

    confirmBtn.disabled = true;  // 禁用按鈕

    for (let i = 0; i < files.length; i++) {
      let file = files[i];

      const progress = Math.round((i / files.length) * 100);
      confirmBtn.textContent = `處理中 (${progress}%)`;

      // 首先執行所有調整步驟
      if (allSteps.length > 0) {
        for (const step of allSteps) {
          const action = step.querySelector("#step-action").value;
          const actionMethod = (action == "resize") ? step.querySelector("#according").value : step.querySelector("#crop-from").value;
          const resultValue = step.querySelector("#step-size").value;

          file = await adjustment(file, action, actionMethod, resultValue, convertToJpgCheckbox);
        }
      }

      // 然後執行壓縮（如果需要）
      if (qualityCheckbox) {
        file = await compressImage(file, qualityValue, convertToJpgCheckbox);
      }
      // 添加處理後的文件到 zip
      const fileName = convertToJpgCheckbox ? `${file.name.split('.')[0]}.jpg` : file.name;
      zip.file(fileName, file);
    }

    confirmBtn.textContent = "生成壓縮檔...";
    zip.generateAsync({ type: "blob" }).then(function (zipContent) {
      saveAs(zipContent, "processed-images.zip");
      confirmBtn.textContent = originalBtnText;
      confirmBtn.disabled = false;  // 重新啟用按鈕
    });
  } else {
    alert("請選擇一張或多張圖片!");
  }
});

// 調整圖片的功能
async function adjustment(file, action, actionMethod, resultValue, convertToJpg) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let newWidth, newHeight, sx, sy, sWidth, sHeight;

        if (action === "resize") {
          if (actionMethod === "according-width") {
            if (img.width > resultValue) {
              newWidth = parseInt(resultValue);
              newHeight = (img.height * newWidth) / img.width;
            } else {
              newWidth = img.width;
              newHeight = img.height;
            }
          } else if (actionMethod === "according-height") {
            if (img.height > resultValue) {
              newHeight = parseInt(resultValue);
              newWidth = (img.width * newHeight) / img.height;
            } else {
              newWidth = img.width;
              newHeight = img.height;
            }
          }
          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
        } else if (action === "crop") {
          resultValue = parseInt(resultValue);
          switch (actionMethod) {
            case "from-height":
              newWidth = img.width;
              newHeight = resultValue;
              sx = 0;
              sy = (img.height - resultValue) / 2;
              sWidth = img.width;
              sHeight = resultValue;
              break;
            case "from-width":
              newWidth = resultValue;
              newHeight = img.height;
              sx = (img.width - resultValue) / 2;
              sy = 0;
              sWidth = resultValue;
              sHeight = img.height;
              break;
            case "from-up":
              newWidth = img.width;
              newHeight = resultValue;
              sx = 0;
              sy = 0;
              sWidth = img.width;
              sHeight = resultValue;
              break;
            case "from-bottom":
              newWidth = img.width;
              newHeight = resultValue;
              sx = 0;
              sy = img.height - resultValue;
              sWidth = img.width;
              sHeight = resultValue;
              break;
            case "from-right":
              newWidth = resultValue;
              newHeight = img.height;
              sx = 0;
              sy = 0;
              sWidth = resultValue;
              sHeight = img.height;
              break;
            case "from-left":
              newWidth = resultValue;
              newHeight = img.height;
              sx = img.width - resultValue;
              sy = 0;
              sWidth = resultValue;
              sHeight = img.height;
              break;
          }
          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, newWidth, newHeight);
        }

        const mimeType = convertToJpg ? "image/jpeg" : file.type;
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: mimeType }));
        }, mimeType);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 壓縮圖片的功能
async function compressImage(file, maxSizeKB, convertToJpg) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        let quality = 1.0;
        const mimeType = convertToJpg ? "image/jpeg" : file.type;

        const compressLoop = function () {
          canvas.toBlob(function (blob) {
            if (blob.size / 1024 <= maxSizeKB || quality <= 0.1) {
              resolve(new File([blob], file.name, { type: mimeType }));
            } else {
              quality -= 0.1;
              compressLoop();
            }
          }, mimeType, quality);
        };

        compressLoop();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}



document.getElementById("upload-file").addEventListener("change", function (event) {
  const files = event.target.files;
  const previewArea = document.getElementById("preview-area");
  previewArea.innerHTML = ""; // 清空之前的預覽內容

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    //略縮圖
    reader.onload = function (e) {
      const imgPreview = document.createElement("div");
      imgPreview.classList.add("img-preview");
      const imgElement = document.createElement("img");
      imgElement.src = e.target.result;
      imgPreview.appendChild(imgElement);

      const fileName = document.createElement("p");
      const fileSizeKB = (file.size / 1024).toFixed(2);
      fileName.textContent = `${file.name} (${fileSizeKB} KB)`;
      imgPreview.appendChild(fileName);

      previewArea.appendChild(imgPreview);
    };

    reader.readAsDataURL(file);
  });
});



// 儲存設定到 localStorage
function saveSettings() {
  const settings = {
    steps: [],
    compression: {
      enabled: document.getElementById('lower-quality').checked,
      value: document.getElementById('lower-quality-value').value
    },
    convertToJpg: document.getElementById('convert-to-jpg').checked
  };

  // 儲存步驟設定
  document.querySelectorAll('.step').forEach(step => {
    const action = step.querySelector("#step-action").value;
    const actionMethod = (action == "resize") ? step.querySelector("#according").value : step.querySelector("#crop-from").value;
    const resultValue = step.querySelector("#step-size").value;

    settings.steps.push({ action, actionMethod, resultValue });
  });

  // 將設定儲存到 localStorage
  localStorage.setItem('imageProcessingSettings', JSON.stringify(settings));
  alert("設定已儲存");
}

// 從 localStorage 讀取設定並應用
function loadSettings() {
  const savedSettings = localStorage.getItem('imageProcessingSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);

    // 應用步驟設定
    const stepsContainer = document.querySelector('.steps'); // 假設有一個容器來放置所有步驟
    stepsContainer.innerHTML = ''; // 清空現有步驟

    stepCount = settings.steps.length;

    settings.steps.forEach((step, index) => {
      const stepElement = createStepElement(step, index + 1); // 您需要實現這個函數來創建步驟元素
      stepsContainer.appendChild(stepElement);
    });

    // 應用壓縮設定
    document.getElementById('lower-quality').checked = settings.compression.enabled;
    document.getElementById('lower-quality-value').value = settings.compression.value;

    // 應用轉換 JPG 設定
    document.getElementById('convert-to-jpg').checked = settings.convertToJpg;
  }
}

// 創建步驟元素的函數
function createStepElement(stepData, count) {
  const stepElement = document.createElement('div');
  stepElement.classList.add("step");
  stepElement.id = `step-${count}`;
  stepElement.innerHTML = `
  <div class="action-setting">
    <label for="step-action">Step ${count}</label>
    <select id="step-action">
      <option value="resize">等比縮放</option>
      <option value="crop">裁切</option>
    </select>
    <select id="according" class="hidden">
      <option value="according-width">依據寬</option>
      <option value="according-height">依據高</option>
    </select>
    <select id="crop-from" class="hidden">
        <option value="from-height">裁掉上下</option>
        <option value="from-width">裁掉左右</option>
        <option value="from-up">裁掉下方</option>
        <option value="from-bottom">裁掉上方</option>
        <option value="from-right">裁掉右邊</option>
        <option value="from-left">裁掉左邊</option>
    </select>
    </div>
    <div class="action-setting">
      <label for="action-value">––數值(px)</label>
      <input type="number" id="step-size" placeholder="例:600" />
    </div>
     <span class="deleteBtn">刪除</span> 
    `;

  // 設置 action 選擇器
  const actionSelect = stepElement.querySelector("#step-action");
  actionSelect.value = stepData.action;

  // 設置 actionMethod 選擇器
  const actionMethodSelect = stepData.action === 'resize' ? stepElement.querySelector("#according") : stepElement.querySelector("#crop-from");
  actionMethodSelect.classList.remove("hidden");
  actionMethodSelect.value = stepData.actionMethod;

  // 創建並設置 resultValue 輸入
  const resultValueInput = stepElement.querySelector("#step-size");
  resultValueInput.value = stepData.resultValue;

  return stepElement;
}

// 添加事件監聽器
document.addEventListener('DOMContentLoaded', () => {
  // 載入儲存的設定
  loadSettings();

  // 監聽所有步驟的 step-action
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'step-action') {
      const stepContainer = e.target.closest('.step'); // 取得該 step 的父容器
      const accordingSelect = stepContainer.querySelector('#according');
      const cropFromSelect = stepContainer.querySelector('#crop-from');

      if (e.target.value === 'resize') {
        // 選擇"等比縮放"，顯示 according，隱藏 crop-from
        accordingSelect.classList.remove('hidden');
        cropFromSelect.classList.add('hidden');
      } else if (e.target.value === 'crop') {
        // 選擇"裁切"，顯示 crop-from，隱藏 according
        cropFromSelect.classList.remove('hidden');
        accordingSelect.classList.add('hidden');
      }
    }
  });

  // 為初始的步驟的刪除按鈕添加事件監聽
  document.querySelectorAll(".deleteBtn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.closest(".step").remove(); // 刪除該步驟
      updateStepNumbers(); // 刪除後更新步驟編號
    });
  });

  // 為 "儲存常用" 按鈕添加事件監聽器
  document.querySelector('.save-settings-btn').addEventListener('click', saveSettings);
});