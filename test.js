// Simple test to verify button clicks work
document.addEventListener('DOMContentLoaded', function() {
  console.log('Test script loaded');
  
  const buttons = document.querySelectorAll('.neon-btn[data-mode]');
  console.log('Found', buttons.length, 'buttons');
  
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      console.log('Button clicked!');
      alert('Button clicked: ' + this.getAttribute('data-mode'));
    });
  });
});