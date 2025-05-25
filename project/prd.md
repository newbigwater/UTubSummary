# Project Overview (프로젝트 개요)

* 크롬 확장 프로그램으로 유튜브 요약을 합니다.

## 요구 사항

1. 크롬 확장프로그램 아이콘 누르면, 요약하기 버튼이 나옵니다.
2. 사용자가 요약하기 버튼을 누르면 유튜브 주소가 webhook을 통해 전달됩니다.
3. 전달된 webhook 요약본을 전달 받게 됩니다.
4. 전달 받은 요약본은 별도의 팝업 창이 뜨도록 합니다.
5. 사용자가 웹훅 URL을 설정할 수 있도록 설정 페이지를 제공합니다.

## 아래와 같이 명세된 주요 파일들을 사용한다.

* manifest.json
* content.js
* background.js
* popup.html
* popup.js
* options.html
* options.js
* styles.css
* icon.png (16x16, 48x48, 128x128 크기 각각 필요)

## 개발 환경

1. OS: Windows11
2. Terminal : powershell
3. IDE: Cursor AI

# Function Specification (기능 명세서)

## 1. Core Functionalities (핵심 기능)

* 확장 아이콘 클릭 시 popup.html이 실행되고 '요약하기' 버튼이 노출됩니다.
* 사용자가 버튼을 클릭하면 popup.js가 현재 탭의 유튜브 URL을 추출합니다.
* background.js가 해당 URL을 webhook 서버에 POST 요청으로 전달합니다.
* 서버로부터 받은 요약 결과는 다시 popup.js에 전달되어 팝업 창에 표시됩니다.
* content.js는 유튜브 페이지 내에서 동작하며, 필요한 경우 페이지 내 정보(제목, 설명 등)를 추출합니다.
* options.html과 options.js를 통해 사용자가 직접 웹훅 URL을 설정할 수 있습니다.

## 2. 주요 기능 명세 및 코드 예시

### manifest.json 예시

```json
{
  "manifest_version": 3,
  "name": "YouTube Summary",
  "version": "1.0",
  "description": "Summarize YouTube videos via webhook.",
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["https://*/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["*://*.youtube.com/*"],
    "js": ["content.js"]
  }],
  "web_accessible_resources": [{
    "resources": ["summary.html", "summary.js", "options.html", "options.js"],
    "matches": ["<all_urls>"]
  }]
}
```

### popup.html 예시

```html
<!DOCTYPE html>
<html>
<head>
  <title>YouTube Summary</title>
  <link rel="stylesheet" href="styles.css">
  <meta charset="UTF-8">
  <style>
    .settings-link {
      text-align: center;
      margin-top: 15px;
      font-size: 12px;
    }
    
    .settings-link a {
      color: #c00;
      text-decoration: none;
    }
    
    .settings-link a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>YouTube 영상 요약</h1>
    <button id="summarizeBtn">요약하기</button>
    <div id="loadingIndicator" class="hidden">요약 중...</div>
    <div id="result" class="result hidden"></div>
    <div id="error" class="error hidden"></div>
    <div class="settings-link">
      <a id="optionsLink" href="#">설정</a>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### popup.js 예시

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // UI 요소 참조
  const summarizeBtn = document.getElementById('summarizeBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultContainer = document.getElementById('result');
  const errorContainer = document.getElementById('error');
  const optionsLink = document.getElementById('optionsLink');

  // 요약하기 버튼 클릭 이벤트 처리
  summarizeBtn.addEventListener('click', async () => {
    // UI 상태 변경
    resetUI();
    loadingIndicator.classList.remove('hidden');
    summarizeBtn.disabled = true;

    try {
      // 현재 활성화된 탭 정보 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 유튜브 영상 URL인지 확인
      if (!tab.url || !tab.url.includes('youtube.com/watch')) {
        throw new Error('유튜브 영상 페이지에서만 사용 가능합니다.');
      }
      
      // background.js로 URL 및 제목 전송
      chrome.runtime.sendMessage({ 
        type: 'SEND_URL', 
        url: tab.url,
        title: tab.title
      });
    } catch (error) {
      showError(error.message);
    }
  });
  
  // 설정 링크 클릭 이벤트 처리
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // 메시지 리스너 - background.js로부터 응답 수신
  chrome.runtime.onMessage.addListener((message) => {
    loadingIndicator.classList.add('hidden');
    summarizeBtn.disabled = false;
    
    if (message.type === 'SUMMARY_REQUESTED' && message.success) {
      // 요약 요청이 성공적으로 처리되었음을 표시
      resultContainer.innerText = '요약 창이 열렸습니다.';
      resultContainer.classList.remove('hidden');
      
      // 팝업 창을 잠시 후 닫음
      setTimeout(() => {
        window.close();
      }, 1000);
    } else if (message.type === 'SUMMARY_ERROR') {
      showError(message.error);
    }
  });

  // 오류 표시 함수
  function showError(message) {
    errorContainer.innerText = message;
    errorContainer.classList.remove('hidden');
    loadingIndicator.classList.add('hidden');
    summarizeBtn.disabled = false;
  }

  // UI 초기화 함수
  function resetUI() {
    resultContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
  }
});
```

### background.js 예시

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_URL') {
    console.log('요약 요청 URL:', message.url);
    
    // 유튜브 비디오 정보 추출
    const videoId = extractVideoId(message.url);
    const videoTitle = message.title || 'YouTube 영상';
    
    // 요약 결과 페이지를 새 창에서 열기
    openSummaryPage(videoId, message.url, videoTitle);
    
    // popup.js에 성공 응답 보내기
    chrome.runtime.sendMessage({ 
      type: 'SUMMARY_REQUESTED', 
      success: true 
    });
  }
  // 요약 페이지에서 요약 요청을 받으면 처리
  else if (message.type === 'GET_SUMMARY') {
    console.log('GET_SUMMARY 메시지 수신:', message);
    
    fetchSummary(message.url, message.title)
      .then(summaryData => {
        sendResponse({
          success: true,
          summary: summaryData.summary
        });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
    return true; // 비동기 응답을 위해 true 반환
  }
});

async function fetchSummary(url, title) {
  try {
    console.log('요약 요청 URL:', url);
    console.log('영상 제목:', title);
    
    // URL에서 비디오 ID 추출
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      throw new Error('유효한 YouTube 비디오 URL이 아닙니다.');
    }
    
    // 기본 썸네일 URL 생성
    const defaultThumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    
    // 저장된 웹훅 URL 가져오기
    const { webhookUrl } = await chrome.storage.sync.get(['webhookUrl']);
    
    // 웹훅 URL 확인
    if (!webhookUrl) {
      throw new Error('웹훅 URL이 설정되지 않았습니다. 확장 프로그램 설정에서 웹훅 URL을 설정해주세요.');
    }
    
    console.log('웹훅 요청 시작:', webhookUrl);
    
    // 웹훅으로 요청 전송
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        videoUrl: url,
        videoId: videoId,
        videoTitle: title,
        responseFormat: 'json'
      })
    });
    
    // 응답 처리 로직
    // ...
  } catch (error) {
    console.error('요약 요청 중 오류 발생:', error);
    throw new Error('요약을 가져오는 중 오류가 발생했습니다: ' + error.message);
  }
}
```

### options.html 예시

```html
<!DOCTYPE html>
<html>
<head>
  <title>YouTube 요약 확장 프로그램 설정</title>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
      color: #333;
    }
    
    h1 {
      color: #c00;
      margin-top: 0;
      border-bottom: 1px solid #eee;
      padding-bottom: 15px;
      font-size: 24px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    input[type="text"] {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    button {
      background-color: #c00;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    
    button:hover {
      background-color: #900;
    }
    
    .status {
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
    }
    
    .success {
      background-color: #dff0d8;
      color: #3c763d;
    }
    
    .error {
      background-color: #f2dede;
      color: #a94442;
    }
    
    .note {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>YouTube 요약 확장 프로그램 설정</h1>
  
  <div class="form-group">
    <label for="webhookUrl">웹훅 URL:</label>
    <input type="text" id="webhookUrl" placeholder="웹훅 URL을 입력해주세요 (필수)">
    <div class="note">요약 서비스 API의 웹훅 URL을 입력하세요. 이 설정은 필수입니다.</div>
  </div>
  
  <button id="saveBtn">저장</button>
  
  <div id="status" class="status" style="display: none;"></div>
  
  <script src="options.js"></script>
</body>
</html>
```

### options.js 예시

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // 요소 참조
  const webhookUrlInput = document.getElementById('webhookUrl');
  const saveButton = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  
  // 저장된 설정 불러오기
  loadSettings();
  
  // 저장 버튼 이벤트 리스너
  saveButton.addEventListener('click', saveSettings);
  
  /**
   * 설정 불러오기 함수
   */
  function loadSettings() {
    chrome.storage.sync.get(['webhookUrl'], (result) => {
      if (result.webhookUrl) {
        webhookUrlInput.value = result.webhookUrl;
      } else {
        // 기본값 없음
        webhookUrlInput.value = '';
      }
    });
  }
  
  /**
   * 설정 저장 함수
   */
  function saveSettings() {
    const webhookUrl = webhookUrlInput.value.trim();
    
    // 입력값 검증
    if (!webhookUrl) {
      showStatus('웹훅 URL을 입력해주세요.', 'error');
      return;
    }
    
    // URL 형식 검증
    try {
      new URL(webhookUrl); // URL 형식 검사
    } catch (e) {
      showStatus('유효한 URL 형식이 아닙니다.', 'error');
      return;
    }
    
    // 설정 저장
    chrome.storage.sync.set({ webhookUrl }, () => {
      showStatus('설정이 저장되었습니다.', 'success');
    });
  }
  
  /**
   * 상태 메시지 표시 함수
   * @param {string} message - 표시할 메시지
   * @param {string} type - 메시지 유형 (success 또는 error)
   */
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    // 3초 후 상태 메시지 숨기기
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
```

### content.js 예시

```javascript
// 필요한 경우 페이지에서 추가 정보를 추출하는 기능
// 현재는 필요하지 않으므로 비워둠
// 추후 확장 시 유튜브 페이지 내 정보를 추출하는 기능 구현 가능
```

### styles.css 예시

```css
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  width: 320px;
  padding: 15px;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

h1 {
  font-size: 18px;
  margin: 0;
  color: #c00;
}

button {
  background-color: #c00;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background-color: #900;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.hidden {
  display: none;
}

.result {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.error {
  color: #c00;
  font-weight: bold;
}
```

# Work Flow (동작 순서)

1. 사용자가 크롬 확장 아이콘을 클릭함
2. popup.html이 열리고, 요약하기 버튼이 표시됨
3. 처음 사용 시 설정 페이지에서 웹훅 URL을 설정해야 함
4. 버튼 클릭 시 popup.js가 현재 탭 URL을 추출하여 background.js로 전송
5. background.js가 저장된 웹훅 URL로 요청을 전송 (POST)
6. 서버는 요약된 텍스트를 응답함
7. background.js는 응답을 팝업 창에 표시

# Webhook 서버 명세

## 요청 형식
- URL: 사용자가 설정한 웹훅 URL
- 메소드: POST
- 헤더: Content-Type: application/json, Accept: application/json
- 본문: { "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID", "videoId": "VIDEO_ID", "videoTitle": "영상 제목", "responseFormat": "json" }

## 응답 형식
- 성공 시: { "success": true, "summary": { "title": "영상 제목", "content": "영상 요약 전체 내용", "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg" } }
- 실패 시: { "success": false, "error": "오류 메시지" }
- 또는 "Accepted" 응답 (요청 접수, 처리 예정)

# Development Checklist (개발 체크리스트)

- [x] manifest.json 작성
- [x] 아이콘 이미지 준비 (16x16, 48x48, 128x128)
- [x] popup.html 구현
- [x] styles.css 구현
- [x] popup.js 구현
- [x] background.js 구현
- [x] content.js 구현 (필요시)
- [x] options.html 구현
- [x] options.js 구현
- [x] 로컬 테스트
- [ ] 크롬 웹 스토어 배포 준비

# File Structure (파일구조)

```
youtube-summary-extension/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── content.js
├── options.html
├── options.js
├── summary.html
├── summary.js
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

# Doc (문서)

* Chrome Extensions 공식 문서: [https://developer.chrome.com/docs/extensions/mv3/](https://developer.chrome.com/docs/extensions/mv3/)
* fetch API 문서: [https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
* chrome.runtime 메시지 구조 문서: [https://developer.chrome.com/docs/extensions/mv3/messaging/](https://developer.chrome.com/docs/extensions/mv3/messaging/)
* chrome.storage API 문서: [https://developer.chrome.com/docs/extensions/reference/storage/](https://developer.chrome.com/docs/extensions/reference/storage/)
