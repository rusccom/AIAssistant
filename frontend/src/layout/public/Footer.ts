const footerTemplate = `
    <footer class="main-footer">
        <p>&copy; 2025 AIAssistant. All rights reserved.</p>
    </footer>
`;

export const insertFooter = () => {
    const app = document.getElementById('app');
    if (app) {
        app.insertAdjacentHTML('beforeend', footerTemplate);
    }
};
