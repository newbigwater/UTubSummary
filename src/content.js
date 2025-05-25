/**
 * YouTube Summary Extension
 * content.js - 유튜브 페이지에 삽입되는 콘텐츠 스크립트
 * 
 * 현재 버전에서는 특별한 기능을 수행하지 않지만,
 * 향후 확장을 위해 기본 구조를 유지합니다.
 * 
 * 가능한 확장 기능:
 * 1. 유튜브 페이지에 직접 요약 버튼 추가
 * 2. 영상 제목, 설명 등의 메타데이터 추출
 * 3. 자막 데이터 추출 등
 */

console.log('YouTube Summary Extension - Content Script loaded');

// 페이지에서 유튜브 영상 ID 추출 함수
function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// 메시지 리스너 - 필요시 popup.js 또는 background.js와 통신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 예: 필요한 경우 페이지에서 정보를 추출하여 응답
  if (message.type === 'GET_VIDEO_INFO') {
    const videoId = getYouTubeVideoId();
    const title = document.title.replace(' - YouTube', '');
    
    sendResponse({
      videoId,
      title
    });
  }
  return true; // 비동기 응답을 위해 true 반환
});