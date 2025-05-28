// Buscar CEP
function buscarCEP() {
    let cepInput = document.getElementById('inputCEPClient');
    let cep = cepInput.value.replace(/\D/g, '');
    
    const clearAddressFields = () => {
        document.getElementById('inputAddressClient').value = "";
        document.getElementById('inputNeighborhoodClient').value = "";
        document.getElementById('inputCityClient').value = "";
        document.getElementById('inputUFClient').value = "";
    };
    
    if (cep.length !== 8) {
        alert("CEP inválido. O CEP deve conter 8 números.");
        clearAddressFields();
        cepInput.focus();
        return;
    }
    
    cepInput.disabled = true;
    let loadingSpan = document.createElement('span');
    loadingSpan.innerHTML = ' Buscando...';
    loadingSpan.style.color = '#666';
    cepInput.parentNode.appendChild(loadingSpan);
    
    let urlAPI = `https://viacep.com.br/ws/${cep}/json/`;
    
    fetch(urlAPI)
        .then(response => {
            if (!response.ok) throw new Error(`Erro na API ViaCEP: ${response.status}`);
            return response.json();
        })
        .then(dados => {
            cepInput.parentNode.removeChild(loadingSpan);
            cepInput.disabled = false;
            
            if (dados.erro) {
                alert("CEP não encontrado. Verifique o número digitado.");
                clearAddressFields();
                cepInput.focus();
            } else {
                document.getElementById('inputAddressClient').value = dados.logradouro || "";
                document.getElementById('inputNeighborhoodClient').value = dados.bairro || "";
                document.getElementById('inputCityClient').value = dados.localidade || "";
                document.getElementById('inputUFClient').value = dados.uf || "";
                
                const numberField = document.getElementById('inputNumberClient');
                numberField.focus();
                numberField.style.borderColor = '#4CAF50';
                setTimeout(() => {
                    numberField.style.borderColor = '';
                }, 2000);
            }
        })
        .catch(error => {
            console.error("Erro ao buscar CEP:", error);
            cepInput.parentNode.removeChild(loadingSpan);
            cepInput.disabled = false;
            alert("Não foi possível buscar o CEP. Verifique sua conexão ou tente novamente mais tarde.");
            clearAddressFields();
        });
}

// Máscaras
document.getElementById('inputCEPClient').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) value = value.substring(0, 5) + '-' + value.substring(5, 8);
    e.target.value = value;
});

document.getElementById('inputCEPClient').addEventListener('blur', function(e) {
    if (e.target.value.replace(/\D/g, '').length === 8) buscarCEP();
});

document.getElementById('inputCPFClient').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.substring(0, 3) + '.' + value.substring(3);
    if (value.length > 7) value = value.substring(0, 7) + '.' + value.substring(7);
    if (value.length > 11) value = value.substring(0, 11) + '-' + value.substring(11);
    e.target.value = value.substring(0, 14);
});

document.getElementById('inputCPFClient').addEventListener('blur', function(e) {
    const cpf = e.target.value.replace(/\D/g, '');
    if (cpf.length > 0 && cpf.length !== 11) {
        alert("CPF inválido. Deve conter 11 dígitos.");
        e.target.focus();
    }
});

// Foco na busca
const foco = document.getElementById('searchClient');
let arrayClient = [];

document.addEventListener('DOMContentLoaded', () => {
    btnUpdate.disabled = true;
    btnDelete.disabled = true;
    btnCreate.disabled = false;
    foco.focus();
});

// Captura dos inputs
let frmClient = document.getElementById('formClient');
let nameClient = document.getElementById('inputNameClient');
let cpfClient = document.getElementById('inputCPFClient');
let emailClient = document.getElementById('inputEmailClient');
let phoneClient = document.getElementById('inputPhoneClient');
let cepClient = document.getElementById('inputCEPClient');
let addressClient = document.getElementById('inputAddressClient');
let numberClient = document.getElementById('inputNumberClient');
let complementClient = document.getElementById('inputComplementClient');
let neighborhoodClient = document.getElementById('inputNeighborhoodClient');
let cityClient = document.getElementById('inputCityClient');
let ufClient = document.getElementById('inputUFClient');
let idClient = document.getElementById('inputIdClient');

// Manipulação do Enter
function teclaEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        searchName();
    }
}

frmClient.addEventListener('keydown', teclaEnter);

// Listener para renderizar dados do cliente (configurado uma vez, globalmente)
api.renderClient((event, clientJSON) => {
    const searchField = document.getElementById('searchClient');
    // Encontrar e remover o span de loading, se existir
    const loadingSpan = searchField.parentNode.querySelector('span');
    if (loadingSpan && loadingSpan.innerHTML.includes('Buscando...')) {
        searchField.parentNode.removeChild(loadingSpan);
    }
    searchField.disabled = false;

    if (!clientJSON) {
        console.error("renderClient recebeu dados nulos ou indefinidos do main process.");
        // O main.js deve ter lidado com isso enviando reset-form ou set-name
        return;
    }

    try {
        const clientDataArray = JSON.parse(clientJSON);
        // arrayClient = clientDataArray; // Se arrayClient ainda for usado em outros lugares

        if (clientDataArray.length > 0) {
            const c = clientDataArray[0]; // Pega o primeiro cliente do array retornado
            idClient.value = c._id;
            nameClient.value = c.nomeCliente;
            cpfClient.value = c.cpfCliente; // Considere aplicar máscara aqui se necessário
            emailClient.value = c.emailCliente;
            phoneClient.value = c.foneCliente;
            cepClient.value = c.cepCliente; // Considere aplicar máscara aqui se necessário
            addressClient.value = c.logradouroCliente;
            numberClient.value = c.numeroCliente;
            complementClient.value = c.complementoCliente;
            neighborhoodClient.value = c.bairroCliente;
            cityClient.value = c.cidadeCliente;
            ufClient.value = c.ufCliente;

            btnCreate.disabled = true;
            btnUpdate.disabled = false;
            btnDelete.disabled = false;
            restaurarEnter(); // Remove o listener de Enter do form após carregar dados
        } else {
            // Este bloco não deve ser alcançado se o main.js estiver tratando corretamente
            // os casos de "não encontrado" com 'reset-form' ou 'set-name'.
            console.warn("renderClient recebeu um array vazio, o que não era esperado neste ponto.");
        }
    } catch (error) {
        console.error("Erro ao fazer parse dos dados do cliente em renderClient:", error);
        alert("Erro ao processar os dados do cliente recebidos.");
    }
});

function restaurarEnter() {
    frmClient.removeEventListener('keydown', teclaEnter);
}

// CRUD Operations
frmClient.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const client = {
        nameCli: nameClient.value,
        cpfCli: cpfClient.value.replace(/\D/g, ''),
        emailCli: emailClient.value,
        phoneCli: phoneClient.value,
        cepCli: cepClient.value.replace(/\D/g, ''),
        addressCli: addressClient.value,
        numberCli: numberClient.value,
        complementCli: complementClient.value,
        neighborhoodCli: neighborhoodClient.value,
        cityCli: cityClient.value,
        ufCli: ufClient.value
    };
    
    api.newClient(client);
});

// Busca por nome/CPF
function searchName() {
    let searchInput = document.getElementById('searchClient').value.trim();
    
    if (searchInput === "") {
        api.validateSearch();
        return;
    }
    
    const searchField = document.getElementById('searchClient');
    // Remover span de loading anterior, se houver, para evitar duplicação
    const existingLoadingSpan = searchField.parentNode.querySelector('span');
    if (existingLoadingSpan && existingLoadingSpan.innerHTML.includes('Buscando...')) {
        searchField.parentNode.removeChild(existingLoadingSpan);
    }

    searchField.disabled = true;
    let loadingSpan = document.createElement('span');
    loadingSpan.innerHTML = ' Buscando...';
    loadingSpan.style.color = '#666';
    searchField.parentNode.appendChild(loadingSpan);
    
    api.searchName(searchInput); // Apenas envia o pedido. A resposta será tratada pelo listener global.
}

api.setName((event, nameToSet) => {
    const searchField = document.getElementById('searchClient');
    const loadingSpan = searchField.parentNode.querySelector('span');
    if (loadingSpan && loadingSpan.innerHTML.includes('Buscando...')) {
        searchField.parentNode.removeChild(loadingSpan);
    }
    searchField.disabled = false;

    if (foco) foco.value = "";
    if (nameClient) {
        nameClient.value = nameToSet;
        nameClient.focus();
    }
    restaurarEnter();
});

api.setCpf((event, cpfToSet) => {
    // Esta função é chamada por algum evento do main.js?
    // Se sim, também precisa limpar o estado de "buscando..."
    const searchField = document.getElementById('searchClient');
    const loadingSpan = searchField.parentNode.querySelector('span');
    if (loadingSpan && loadingSpan.innerHTML.includes('Buscando...')) {
        searchField.parentNode.removeChild(loadingSpan);
    }
    searchField.disabled = false;

    if (foco) foco.value = "";
    if (cpfClient) {
        cpfClient.value = cpfToSet.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        cpfClient.focus();
    }
    restaurarEnter();
});

// Reset do formulário
function performReset() {
    const searchField = document.getElementById('searchClient');
    const loadingSpan = searchField.parentNode.querySelector('span');
    // Verifica se o span é o de loading antes de remover
    if (loadingSpan && loadingSpan.innerHTML.includes('Buscando...')) {
        searchField.parentNode.removeChild(loadingSpan);
    }
    searchField.disabled = false;

    if (frmClient) frmClient.reset();
    if (idClient) idClient.value = "";
    arrayClient = [];
    
    btnCreate.disabled = false;
    btnUpdate.disabled = true;
    btnDelete.disabled = true;
    
    if (foco) {
        foco.value = "";
        foco.focus();
    }
    
    const fieldsToReset = ['inputCPFClient', 'inputNumberClient'];
    fieldsToReset.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.style.borderColor = '';
    });
    
    frmClient.addEventListener('keydown', teclaEnter);
}

api.resetForm(performReset);

// Tratamento de erro de CPF duplicado
api.onCpfDuplicateError(() => {
    // Se o erro de CPF duplicado ocorrer após uma busca, limpar o estado de busca também
    const searchField = document.getElementById('searchClient');
    const loadingSpan = searchField.parentNode.querySelector('span');
    if (loadingSpan && loadingSpan.innerHTML.includes('Buscando...')) {
        searchField.parentNode.removeChild(loadingSpan);
    }
    searchField.disabled = false;

    if (cpfClient) {
        cpfClient.value = '';
        cpfClient.style.borderColor = 'red';
        cpfClient.focus();
        
        cpfClient.addEventListener('input', function onInput() {
            cpfClient.style.borderColor = '';
            cpfClient.removeEventListener('input', onInput);
        }, { once: true });
    }
});

// Funções de atualização e exclusão
function updateClient() {
    if (idClient.value === "") return;
    
    const client = {
        nameCli: nameClient.value,
        cpfCli: cpfClient.value.replace(/\D/g, ''),
        emailCli: emailClient.value,
        phoneCli: phoneClient.value,
        cepCli: cepClient.value.replace(/\D/g, ''),
        addressCli: addressClient.value,
        numberCli: numberClient.value,
        complementCli: complementClient.value,
        neighborhoodCli: neighborhoodClient.value,
        cityCli: cityClient.value,
        ufCli: ufClient.value
    };
    
    // Você precisará implementar a função de atualização no main process
    // api.updateClient(idClient.value, client);
    alert("Funcionalidade de edição será implementada aqui");
}

function removeClient() {
    if (idClient.value === "") return;
    api.deleteClient(idClient.value);
}