/**
 * YouTube Summary Extension
 * background.js - 백그라운드 서비스 워커 및 API 요청 처리
 */

// 메시지 리스너 - popup.js로부터 URL 수신 및 요약 요청 처리
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
        console.log('요약 데이터 응답 준비:', summaryData);
        
        // 응답 객체 구성
        const response = {
          success: true,
          summary: summaryData.summary
        };
        
        console.log('최종 응답 데이터:', response);
        sendResponse(response);
      })
      .catch(error => {
        console.error('요약 오류:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
    return true; // 비동기 응답을 위해 true 반환
  }
});

/**
 * 요약 결과 페이지를 새 창에서 여는 함수
 * @param {string} videoId - YouTube 비디오 ID
 * @param {string} url - 원본 URL
 * @param {string} title - 비디오 제목
 */
function openSummaryPage(videoId, url, title) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  
  chrome.windows.create({
    url: chrome.runtime.getURL(`summary.html?id=${videoId}&url=${encodedUrl}&title=${encodedTitle}`),
    type: 'popup',
    width: 800,
    height: 700
  });
}

/**
 * 웹훅을 통해 요약 결과를 가져오는 함수
 * @param {string} url - 요약할 YouTube 영상 URL
 * @param {string} title - 영상 제목 (있는 경우)
 * @returns {Promise<object>} - 요약 텍스트 및 추가 정보
 */
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
        responseFormat: 'json' // JSON 응답 요청
      })
    });
    
    if (!response.ok) {
      throw new Error(`요약 서비스 응답 오류: ${response.status}`);
    }
    
    // 응답 텍스트 확인
    const responseText = await response.text();
    
    console.log('웹훅 응답 텍스트:', responseText);
    
    // "Accepted" 응답인 경우, 임시 요약 반환
    if (responseText.trim() === 'Accepted') {
      return {
        success: true,
        summary: {
          title: title || 'YouTube 영상',
          content: `요청이 성공적으로 접수되었습니다. 영상에 대한 요약이 곧 준비될 예정입니다.\n\n영상 ID: ${videoId}\n\n현재 백엔드 시스템에서 처리 중입니다. 나중에 다시 시도해 주세요.`,
          thumbnail: defaultThumbnail
        }
      };
    }
    
    // JSON 응답 파싱 시도
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('파싱된 응답 데이터:', data);
    } catch (e) {
      console.error('JSON 파싱 오류:', e);
      // JSON이 아닌 경우 텍스트 응답 처리
      return {
        success: true,
        summary: {
          title: title || 'YouTube 영상',
          content: responseText,
          thumbnail: defaultThumbnail
        }
      };
    }
    
    // data가 이미 우리가 원하는 구조(success + summary)인 경우 그대로 반환
    if (data && data.success === true && data.summary && typeof data.summary === 'object') {
      // thumbnail 필드가 없거나 불완전한 경우 기본값 설정
      if (!data.summary.thumbnail || 
          typeof data.summary.thumbnail !== 'string' || 
          !data.summary.thumbnail.startsWith('http')) {
        data.summary.thumbnail = defaultThumbnail;
      }
      
      return data;
    }
    
    // 다른 형태의 응답을 표준 형식으로 변환
    return {
      success: true,
      summary: {
        title: data?.title || title || 'YouTube 영상',
        content: data?.content || data?.summary || '요약 내용이 없습니다.',
        thumbnail: data?.thumbnail || defaultThumbnail
      }
    };
    
  } catch (error) {
    console.error('요약 요청 중 오류 발생:', error);
    throw new Error('요약을 가져오는 중 오류가 발생했습니다: ' + error.message);
  }
}

/**
 * YouTube URL에서 비디오 ID를 추출하는 함수
 * @param {string} url - YouTube 영상 URL
 * @returns {string} - 비디오 ID 또는 빈 문자열
 */
function extractVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v') || '';
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.substring(1);
    }
    return '';
  } catch (e) {
    return '';
  }
} 