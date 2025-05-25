/**
 * YouTube Summary Extension
 * popup.js - 팝업 UI 관리 및 요약 요청 처리
 */

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