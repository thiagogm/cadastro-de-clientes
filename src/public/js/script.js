// public/js/script.js

// Função para abrir a janela de clientes (chamada pelo onclick no HTML)
function openClientWindow() {
    // Comunicação com o processo principal via IPC para abrir a janela de clientes
    window.electronAPI.openClientWindow();
}

// Lógica para exibir a data atual no rodapé
document.addEventListener('DOMContentLoaded', () => {
    const dataAtualElement = document.getElementById('dataAtual');
    if (dataAtualElement) {
        const data = new Date();
        dataAtualElement.textContent = `© ${data.getFullYear()} - Seu Nome ou Empresa`;
    }

    // Pedir ao processo principal para verificar o status do DB
    window.electronAPI.dbConnect();

    // Ouvir a resposta do processo principal sobre o status do DB
    window.electronAPI.onDbStatus((status) => {
        const statusDbIcon = document.getElementById('statusdb');
        if (statusDbIcon) {
            if (status === 'conectado') {
                statusDbIcon.src = '../../public/img/dbon.png'; // Supondo que você tenha um ícone dbon.png
                statusDbIcon.alt = 'Database Conectado';
                statusDbIcon.title = 'Database Conectado';
            } else {
                statusDbIcon.src = '../../public/img/dboff.png';
                statusDbIcon.alt = 'Database Desconectado';
                statusDbIcon.title = 'Database Desconectado';
            }
        }
    });
});