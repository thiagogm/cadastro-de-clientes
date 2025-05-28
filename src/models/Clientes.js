// public/js/cliente.js

document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do DOM
    const form = document.getElementById('clientForm');
    const clientIdInput = document.getElementById('clientId');
    const searchClientInput = document.getElementById('searchClient');
    const nameInput = document.getElementById('name');
    const cpfInput = document.getElementById('cpf');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const cepInput = document.getElementById('cep');
    const addressInput = document.getElementById('address');
    const numberInput = document.getElementById('number');
    const complementInput = document.getElementById('complement');
    const neighborhoodInput = document.getElementById('neighborhood');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');

    const btnSearch = document.getElementById('btnSearch');
    const btnSave = document.getElementById('btnSave');
    const btnUpdate = document.getElementById('btnUpdate');
    const btnDelete = document.getElementById('btnDelete');
    const btnClear = document.getElementById('btnClear');
    const btnSearchCep = document.getElementById('btnSearchCep');

    // Funções de máscara
    const applyCpfMask = (value) => {
        return value.replace(/\D/g, '') // Remove tudo o que não é dígito
                    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
                    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o sexto e o sétimo dígitos
                    .replace(/(\d{3})(\d{1,2})$/, '$1-$2'); // Coloca um hífen entre o nono e o décimo dígitos
    };

    const applyPhoneMask = (value) => {
        value = value.replace(/\D/g, ''); // Remove tudo o que não é dígito
        if (value.length > 10) {
            return value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else {
            return value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
        }
    };

    const applyCepMask = (value) => {
        return value.replace(/\D/g, '') // Remove tudo o que não é dígito
                    .replace(/^(\d{5})(\d)/, '$1-$2'); // Coloca um hífen entre o quinto e o sexto dígitos
    };

    cpfInput.addEventListener('input', (e) => {
        e.target.value = applyCpfMask(e.target.value);
    });

    phoneInput.addEventListener('input', (e) => {
        e.target.value = applyPhoneMask(e.target.value);
    });

    cepInput.addEventListener('input', (e) => {
        e.target.value = applyCepMask(e.target.value);
    });

    // Função para limpar o formulário
    const clearForm = () => {
        form.reset(); // Limpa todos os campos do formulário
        clientIdInput.value = ''; // Limpa o ID oculto
        btnSave.style.display = 'inline-block'; // Mostra Salvar
        btnUpdate.style.display = 'none';      // Oculta Atualizar
        btnDelete.style.display = 'none';      // Oculta Excluir
        searchClientInput.value = ''; // Limpa o campo de busca
        nameInput.focus(); // Foca no primeiro campo
    };

    // Função para preencher o formulário com dados do cliente
    const populateForm = (client) => {
        clientIdInput.value = client._id;
        nameInput.value = client.nomeCliente;
        cpfInput.value = applyCpfMask(client.cpfCliente); // Aplica máscara ao preencher
        emailInput.value = client.emailCliente;
        phoneInput.value = applyPhoneMask(client.foneCliente); // Aplica máscara ao preencher
        cepInput.value = applyCepMask(client.cepCliente); // Aplica máscara ao preencher
        addressInput.value = client.logradouroCliente;
        numberInput.value = client.numeroCliente;
        complementInput.value = client.complementoCliente;
        neighborhoodInput.value = client.bairroCliente;
        cityInput.value = client.cidadeCliente;
        stateInput.value = client.ufCliente;

        btnSave.style.display = 'none';         // Oculta Salvar
        btnUpdate.style.display = 'inline-block'; // Mostra Atualizar
        btnDelete.style.display = 'inline-block'; // Mostra Excluir
    };

    // =======================================================
    // Event Listeners dos Botões
    // =======================================================

    btnClear.addEventListener('click', clearForm);

    btnSave.addEventListener('click', () => {
        if (!form.checkValidity()) { // Validação HTML5
            form.reportValidity();
            return;
        }

        const client = {
            name: nameInput.value,
            cpf: cpfInput.value.replace(/\D/g, ''), // Remove máscara para salvar
            email: emailInput.value,
            phone: phoneInput.value.replace(/\D/g, ''), // Remove máscara para salvar
            cep: cepInput.value.replace(/\D/g, ''),     // Remove máscara para salvar
            address: addressInput.value,
            number: numberInput.value,
            complement: complementInput.value,
            neighborhood: neighborhoodInput.value,
            city: cityInput.value,
            state: stateInput.value
        };
        // Envia os dados para o processo principal via IPC
        window.electronAPI.newClient(client);
    });

    btnUpdate.addEventListener('click', () => {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const id = clientIdInput.value;
        const client = {
            name: nameInput.value,
            cpf: cpfInput.value.replace(/\D/g, ''),
            email: emailInput.value,
            phone: phoneInput.value.replace(/\D/g, ''),
            cep: cepInput.value.replace(/\D/g, ''),
            address: addressInput.value,
            number: numberInput.value,
            complement: complementInput.value,
            neighborhood: neighborhoodInput.value,
            city: cityInput.value,
            state: stateInput.value
        };
        // Envia os dados para o processo principal via IPC
        window.electronAPI.updateClient(id, client);
    });

    btnDelete.addEventListener('click', () => {
        const id = clientIdInput.value;
        if (id) {
            // Envia o ID para o processo principal via IPC
            window.electronAPI.deleteClient(id);
        }
    });

    btnSearch.addEventListener('click', () => {
        const searchInput = searchClientInput.value.trim();
        if (searchInput === '') {
            // Envia para o processo principal para mostrar o diálogo de validação
            window.electronAPI.validateSearch();
            return;
        }
        // Envia a string de busca para o processo principal via IPC
        window.electronAPI.searchName(searchInput);
    });

    // =======================================================
    // Lógica do ViaCEP
    // =======================================================

    btnSearchCep.addEventListener('click', async () => {
        const cep = cepInput.value.replace(/\D/g, ''); // Remove máscara
        if (cep.length !== 8) {
            alert('CEP inválido. Por favor, digite 8 dígitos.');
            return;
        }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                alert('CEP não encontrado.');
                clearForm();
                return;
            }
            addressInput.value = data.logradouro;
            neighborhoodInput.value = data.bairro;
            cityInput.value = data.localidade;
            stateInput.value = data.uf;
            numberInput.focus(); // Foca no campo número após preencher
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert('Ocorreu um erro ao buscar o CEP. Tente novamente.');
            clearForm();
        }
    });

    // =======================================================
    // Recebimento de Respostas do Processo Principal (IPC)
    // =======================================================

    // Ouvir 'render-client' para preencher o formulário após uma busca
    window.electronAPI.onRenderClient((clientJson) => {
        const client = JSON.parse(clientJson);
        if (Array.isArray(client) && client.length > 0) {
            populateForm(client[0]); // Pega o primeiro resultado (se houver múltiplos com o mesmo nome)
        } else {
            // Isso pode acontecer se a busca por CPF retornar um único objeto diretamente
            // ou se o backend enviar um objeto único para renderizar
            populateForm(client);
        }
    });

    // Ouvir 'reset-form' para limpar o formulário
    window.electronAPI.onResetForm(clearForm);

    // Ouvir 'set-name' para preencher o campo nome após uma busca sem resultados
    window.electronAPI.onSetName((name) => {
        nameInput.value = name;
        nameInput.focus();
        btnSave.style.display = 'inline-block';
        btnUpdate.style.display = 'none';
        btnDelete.style.display = 'none';
        clientIdInput.value = '';
    });

    // Ouvir 'cpf-duplicate-error' para lidar com CPF duplicado
    window.electronAPI.onCpfDuplicateError(() => {
        cpfInput.focus(); // Foca no campo CPF
        cpfInput.select(); // Seleciona o texto no campo CPF
    });
});