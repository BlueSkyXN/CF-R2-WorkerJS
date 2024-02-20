// 在TypeScript环境中声明环境变量，以便在编译时避免错误
declare const FALLBACK_URL: string;
declare const FALLBACK_STATUS_CODE: string;
declare const BUCKET_BASE_URL: string;

// 监听fetch事件，每次HTTP请求到达Worker时都会触发此事件
addEventListener('fetch', event => {
    // 响应事件，调用handleRequest函数处理请求
    event.respondWith(handleRequest(event.request))
})

// 定义处理请求的异步函数
async function handleRequest(request) {
    // 从请求中解析URL
    const url = new URL(request.url);

    // 根据请求的路径来决定如何处理请求
    if (url.pathname.startsWith('/worker_from_cf-r2-bucket/')) {
        // 处理作为反向代理到R2存储桶的请求
        const targetPath = url.pathname.replace('/worker_from_cf-r2-bucket', '');
        const bucketUrl = `${BUCKET_BASE_URL}${targetPath}`;
        // 转发请求到R2存储桶并返回响应
        return fetch(bucketUrl, {
            method: request.method, // 保持原始请求的HTTP方法
            headers: request.headers // 保持原始请求的头部
        });
    } else if (url.pathname.startsWith('/worker_proxy_cdnjson-baidu/')) {
        // 处理需要重定向到经过cdnjson和百度图片处理的请求
        const targetPath = url.pathname.replace('/worker_proxy_cdnjson-baidu', '');
        const redirectUrl = `https://image.baidu.com/search/down?url=https://cdn.cdnjson.com/pic.html?url=${BUCKET_BASE_URL}${targetPath}`;
        // 执行302重定向到构造的URL
        return Response.redirect(redirectUrl, 302);
    } else if (url.pathname.startsWith('/worker_to_cf-r2-bucket/')) {
        // 处理直接重定向到R2存储桶中文件的请求
        const targetPath = url.pathname.replace('/worker_to_cf-r2-bucket', '');
        const redirectUrl = `${BUCKET_BASE_URL}${targetPath}`;
        // 执行302重定向到R2存储桶中的文件
        return Response.redirect(redirectUrl, 302);
    } else if (url.pathname.startsWith('/worker_to_cdnjson-baidu-weserv/')) {
        // 处理通过Weserv进行二次封装的请求
        const targetPath = url.pathname.replace('/worker_to_cdnjson-baidu-weserv', '');
        const redirectUrl = `https://images.weserv.nl/?url=https://image.baidu.com/search/down?url=https://cdn.cdnjson.com/pic.html?url=${BUCKET_BASE_URL}${targetPath}`;
        // 执行302重定向到通过Weserv封装的URL
        return Response.redirect(redirectUrl, 302);
    } else {
        // 如果没有匹配的路径，调用回退逻辑
        return handleFallback();
    }
}

// 定义回退逻辑的异步函数
async function handleFallback() {
    // 尝试使用FALLBACK_URL进行302重定向
    if (FALLBACK_URL && isValidUrl(FALLBACK_URL)) {
        return Response.redirect(FALLBACK_URL, 302);
    }

    // 如果FALLBACK_URL不可用或不合法，尝试使用FALLBACK_STATUS_CODE返回指定的状态码
    const statusCode = parseInt(FALLBACK_STATUS_CODE, 10);
    if (!isNaN(statusCode) && statusCode >= 400 && statusCode < 600) {
        return new Response('Fallback', { status: statusCode });
    }

    // 如果FALLBACK_URL和FALLBACK_STATUS_CODE都不可用，返回404状态码
    return new Response('Not found', { status: 404 });
}

// 定义一个函数，用于检查字符串是否为有效的URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true; // 如果成功解析为URL，则返回true
    } catch (_) {
        return false; // 如果解析失败，则返回false
    }
}
