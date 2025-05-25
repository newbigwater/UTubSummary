/**
 * YouTube Summary Extension
 * options.js - 설정 페이지 스크립트
 */

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