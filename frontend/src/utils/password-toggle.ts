export function setupPasswordToggle(toggleId: string, inputId: string) {
    const passwordToggle = document.getElementById(toggleId);
    const passwordInput = document.getElementById(inputId) as HTMLInputElement;
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const eyeOpenPaths = passwordToggle.querySelectorAll('.eye-open');
            const eyeClosedPaths = passwordToggle.querySelectorAll('.eye-closed');
            const isPasswordVisible = passwordInput.type === 'text';
            
            if (isPasswordVisible) {
                // Hide password and show open eye icon
                passwordInput.type = 'password';
                eyeOpenPaths.forEach(path => ((path as HTMLElement).style.display = 'block'));
                eyeClosedPaths.forEach(path => ((path as HTMLElement).style.display = 'none'));
                passwordToggle.setAttribute('aria-label', 'Show password');
            } else {
                // Show password and show closed eye icon
                passwordInput.type = 'text';
                eyeOpenPaths.forEach(path => ((path as HTMLElement).style.display = 'none'));
                eyeClosedPaths.forEach(path => ((path as HTMLElement).style.display = 'block'));
                passwordToggle.setAttribute('aria-label', 'Hide password');
            }
        });
    }
} 