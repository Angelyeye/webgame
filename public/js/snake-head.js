// 加载蛇头图片
const snakeHeadImage = new Image();

// 设置加载错误处理
snakeHeadImage.onerror = () => {
    console.error('蛇头图片加载失败');
    // 使用备用的简单图形作为替代
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // 绘制一个简单的三角形作为替代图像
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(64, 64);
    ctx.lineTo(0, 64);
    ctx.closePath();
    ctx.fill();
    
    // 将备用图像设置为源
    snakeHeadImage.src = canvas.toDataURL();
};

// 设置图像源为截图
snakeHeadImage.src = '/js/screenshot-20250307-182301.png';

// 导出图片对象
export { snakeHeadImage };