(function(){
  function applySkeleton(img){
    const wrapper = document.createElement('div');
    wrapper.className = 'skeleton';
    wrapper.style.width = img.getAttribute('width')? (img.getAttribute('width')+'px') : img.width+'px';
    wrapper.style.height = img.getAttribute('height')? (img.getAttribute('height')+'px') : img.height+'px';
    img.style.display = 'none';
    img.parentNode.insertBefore(wrapper, img);
    img.addEventListener('load', function(){
      wrapper.remove();
      img.style.display = '';
    });
  }
  window.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('img.card-cover, img.kiosk-hero').forEach(function(img){
      applySkeleton(img);
    });
  });
})();
