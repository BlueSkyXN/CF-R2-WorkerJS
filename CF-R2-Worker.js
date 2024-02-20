addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
  })
  
  async function handleRequest(request) {
    // 解析请求的URL
    const url = new URL(request.url);
  
    if (url.pathname.startsWith('/worker_from_cf-r2-bucket/')) {
      // 反向代理到R2存储桶中的文件
      const targetPath = url.pathname.replace('/worker_from_cf-r2-bucket', '');
      const bucketUrl = `${BUCKET_BASE_URL}${targetPath}`;
      const response = await fetch(bucketUrl, {
        method: request.method,
        headers: request.headers
      });
      return response;
    } else if (url.pathname.startsWith('/worker_proxy_cdnjson-baidu/')) {
      // 302重定向到经过构造的URL
      const targetPath = url.pathname.replace('/worker_proxy_cdnjson-baidu', '');
      const redirectUrl = `https://image.baidu.com/search/down?url=https://cdn.cdnjson.com/pic.html?url=${BUCKET_BASE_URL}${targetPath}`;
      return Response.redirect(redirectUrl, 302);
    } else if (url.pathname.startsWith('/worker_to_cf-r2-bucket/')) {
      // 直接302重定向到R2存储桶中的文件
      const targetPath = url.pathname.replace('/worker_to_cf-r2-bucket', '');
      const redirectUrl = `${BUCKET_BASE_URL}${targetPath}`;
      return Response.redirect(redirectUrl, 302);
    } else if (url.pathname.startsWith('/worker_to_cdnjson-baidu-weserv/')) {
      // 302重定向到通过Weserv进行封装的URL
      const targetPath = url.pathname.replace('/worker_to_cdnjson-baidu-weserv', '');
      const redirectUrl = `https://images.weserv.nl/?url=https://image.baidu.com/search/down?url=https://cdn.cdnjson.com/pic.html?url=${BUCKET_BASE_URL}${targetPath}`;
      return Response.redirect(redirectUrl, 302);
    } else {
      // 回退逻辑
      return handleFallback();
    }
  }
  
  async function handleFallback() {
    // 尝试使用FALLBACK_URL进行302重定向
    if (FALLBACK_URL && isValidUrl(FALLBACK_URL)) {
      return Response.redirect(FALLBACK_URL, 302);
    }
  
    // 使用FALLBACK_STATUS_CODE，如果它是有效的状态码
    const statusCode = parseInt(FALLBACK_STATUS_CODE, 10);
    if (!isNaN(statusCode) && statusCode >= 400 && statusCode < 600) {
      return new Response('Fallback', { status: statusCode });
    }
  
    // 默认回退到404
    return new Response('Not found', { status: 404 });
  }
  
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
  