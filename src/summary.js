/**
 * YouTube Summary Extension
 * summary.js - 요약 결과 페이지 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  // 요소 참조
  const loadingElement = document.getElementById('loading');
  const contentElement = document.getElementById('content');
  const errorElement = document.getElementById('error');
  const summaryElement = document.getElementById('summary');
  const videoTitleElement = document.getElementById('videoTitle');
  const videoUrlElement = document.getElementById('videoUrl');
  const thumbnailElement = document.getElementById('thumbnail');
  const timelineContainer = document.querySelector('.timeline');

  // URL 파라미터에서 데이터 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');
  const videoUrl = urlParams.get('url');
  const videoTitle = urlParams.get('title') || '영상 제목을 가져올 수 없습니다';

  // 페이지 초기화
  initPage();

  // 요약 요청 및 표시
  requestSummary();

  /**
   * 페이지 초기화 함수
   */
  function initPage() {
    if (!videoId || !videoUrl) {
      showError('유효한 비디오 정보를 찾을 수 없습니다.');
      return;
    }

    // 비디오 정보 표시
    const decodedTitle = decodeURIComponent(videoTitle);
    videoTitleElement.textContent = decodedTitle;
    videoUrlElement.textContent = decodeURIComponent(videoUrl);
    document.title = `요약: ${decodedTitle}`;

    // 썸네일 이미지 설정
    setDefaultThumbnail(videoId);
    
    // 썸네일 클릭 시 원본 영상으로 이동
    thumbnailElement.addEventListener('click', () => {
      window.open(decodeURIComponent(videoUrl), '_blank');
    });
    thumbnailElement.style.cursor = 'pointer';
    thumbnailElement.title = '원본 영상 보기';
    
    // 타임라인 섹션 숨기기 (있는 경우에만)
    if (timelineContainer) {
      timelineContainer.style.display = 'none';
    }
  }

  /**
   * 기본 썸네일 설정 함수
   */
  function setDefaultThumbnail(videoId) {
    thumbnailElement.style.backgroundImage = `url(https://i.ytimg.com/vi/${videoId}/mqdefault.jpg)`;
    thumbnailElement.style.backgroundSize = 'cover';
    thumbnailElement.style.backgroundPosition = 'center';
  }

  /**
   * 요약 요청 함수
   */
  function requestSummary() {
    const decodedUrl = decodeURIComponent(videoUrl);
    const decodedTitle = decodeURIComponent(videoTitle);
    
    console.log('요약 요청 시작:', { url: decodedUrl, title: decodedTitle });
    
    // 로딩 표시
    loadingElement.style.display = 'block';
    contentElement.style.display = 'none';
    errorElement.style.display = 'none';
    
    // 요약 내용을 가져오기 위해 background.js에 메시지 전송
    chrome.runtime.sendMessage({ 
      type: 'GET_SUMMARY', 
      url: decodedUrl,
      title: decodedTitle
    }, handleSummaryResponse);
  }

  /**
   * 요약 응답 처리 함수
   * @param {object} response - 백그라운드에서 받은 응답
   */
  function handleSummaryResponse(response) {
    console.log('요약 응답 수신:', response);
    
    if (chrome.runtime.lastError) {
      showError('확장 프로그램과 통신 중 오류가 발생했습니다.');
      console.error('Chrome 런타임 오류:', chrome.runtime.lastError);
      return;
    }
    
    // 로딩 상태 숨기기
    loadingElement.style.display = 'none';
    
    // 응답이 없거나 성공하지 않은 경우
    if (!response || !response.success) {
      const errorMsg = response?.error || '요약을 가져오는 중 오류가 발생했습니다.';
      console.error('요약 실패:', errorMsg);
      showError(errorMsg);
      return;
    }
    
    // 컨텐츠 표시
    contentElement.style.display = 'block';
    
    try {
      // 응답 객체에서 summary 추출
      const summaryData = response.summary;
      console.log('요약 데이터:', summaryData);
      
      // 타이틀 업데이트
      if (summaryData.title) {
        videoTitleElement.textContent = summaryData.title;
        document.title = `요약: ${summaryData.title}`;
      }
      
      // 썸네일 업데이트
      if (summaryData.thumbnail) {
        thumbnailElement.style.backgroundImage = `url(${summaryData.thumbnail})`;
      }
      
      // 요약 내용 표시
      if (summaryData.content) {
        // 줄바꿈 처리하여 요약 내용 표시
        summaryElement.innerHTML = summaryData.content.replace(/\n/g, '<br>');
        
        // 강조 처리
        highlightKeyPoints();
      } else {
        summaryElement.textContent = '요약 내용이 없습니다.';
      }
    } catch (error) {
      console.error('요약 데이터 처리 중 오류 발생:', error);
      showError('요약 데이터를 처리하는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 요약 내 중요 포인트 강조 처리
   */
  function highlightKeyPoints() {
    const content = summaryElement.innerHTML;
    
    // 제목, 번호 목록 등 강조
    let enhancedContent = content
      .replace(/주요 내용:/g, '<strong style="color:#c00;">주요 내용:</strong>')
      .replace(/(\d+\.\s[^<]+)(<br|$)/g, '<span style="font-weight:bold;">$1</span>$2');
      
    summaryElement.innerHTML = enhancedContent;
  }

  /**
   * 오류 표시 함수
   */
  function showError(errorMessage) {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
    errorElement.textContent = errorMessage;
  }
}); 