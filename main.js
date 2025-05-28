console.log("Processo principal");

// shell (acessar links e aplicações externas)
const { app, BrowserWindow, nativeTheme, Menu, ipcMain, dialog, shell } = require('electron');

// Esta linha está relacionada ao preload.js
const path = require('node:path');

// Importação dos métodos conectar e desconectar (módulo de conexão)
const { conectar, desconectar } = require('./database.js');

// Importação do Schema Clientes da camada model
const clientModel = require('./src/models/Clientes.js');

// Importação da biblioteca nativa do JS para manipular arquivos (não diretamente usado para PDF aqui, mas útil)
const fs = require('fs');

// Importação do pacote jspdf (arquivos pdf) npm install jspdf
const { jspdf, default: jsPDF } = require('jspdf');

// Janela principal
let win;
const createWindow = () => {
    // a linha abaixo define o tema (claro ou escuro)
    nativeTheme.themeSource = 'light'; //(dark ou light)
    win = new BrowserWindow({
        width: 800,
        height: 600,
        //autoHideMenuBar: true,
        //minimizable: false,
        resizable: false,
        //ativação do preload.js
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // menu personalizado
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    // CARREGA A PÁGINA PRINCIPAL
    win.loadFile('./src/views/index.html');
};

// Janela sobre
function aboutWindow() {
    nativeTheme.themeSource = 'light';
    const main = BrowserWindow.getFocusedWindow();
    let about;
    if (main) {
        about = new BrowserWindow({
            width: 360,
            height: 200,
            autoHideMenuBar: true,
            resizable: false,
            minimizable: false,
            parent: main,
            modal: true
        });
    }
    //carregar o documento html na janela
    about.loadFile('./src/views/sobre.html');
}

// Janela cliente
let clientWindowInstance;
function openClientWindow() {
    nativeTheme.themeSource = 'light';
    const main = BrowserWindow.getFocusedWindow();
    if (main) {
        clientWindowInstance = new BrowserWindow({
            width: 1010,
            height: 680,
            //autoHideMenuBar: true,
            //resizable: false, // Permitir redimensionar se necessário para formulário
            parent: main,
            modal: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        });
    }
    // CARREGA A PÁGINA DO CLIENTE
    clientWindowInstance.loadFile('./src/views/cliente.html');
    clientWindowInstance.center(); //iniciar no centro da tela
}

// Iniciar a aplicação
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// reduzir logs não críticos
app.commandLine.appendSwitch('log-level', '3');

// iniciar a conexão com o banco de dados (pedido direto do preload.js)
ipcMain.on('db-connect', async (event) => {
    let conectado = await conectar();
    if (conectado) {
        setTimeout(() => {
            event.reply('db-status', "conectado");
        }, 500);
    }
});

// IMPORTANTE ! Desconectar do banco de dados quando a aplicação for encerrada.
app.on('before-quit', () => {
    desconectar();
});

// template do menu (INALETERADO)
const template = [
    {
        label: 'Cadastro',
        submenu: [
            {
                label: 'Clientes',
                click: () => openClientWindow()
            },
            {
                type: 'separator'
            },
            {
                label: 'Sair',
                click: () => app.quit(),
                accelerator: 'Alt+F4'
            }
        ]
    },
    {
        label: 'Relatórios',
        submenu: [
            {
                label: 'Clientes',
                click: () => relatorioClientes()
            }
        ]
    },
    {
        label: 'Ferramentas',
        submenu: [
            {
                label: 'Aplicar zoom',
                role: 'zoomIn'
            },
            {
                label: 'Reduzir',
                role: 'zoomOut'
            },
            {
                label: 'Restaurar o zoom padrão',
                role: 'resetZoom'
            },
            {
                type: 'separator'
            },
            {
                label: 'Recarregar',
                role: 'reload'
            },
            {
                label: 'Ferramentas do desenvolvedor',
                role: 'toggleDevTools'
            }
        ]
    },
    {
        label: 'Ajuda',
        submenu: [
            {
                label: 'Sobre',
                click: () => aboutWindow()
            }
        ]
    }
];

// recebimento dos pedidos do renderizador para abertura de janelas (botões) autorizado no preload.js
ipcMain.on('client-window', () => {
    openClientWindow();
});

// ============================================================
// == Clientes - CRUD Create (INALETERADO, apenas confirmação)
// recebimento do objeto que contem os dados do cliente
ipcMain.on('new-client', async (event, client) => {
    console.log("Recebido novo cliente para cadastro:", client);
    try {
        const newClient = new clientModel({
            nomeCliente: client.name,
            cpfCliente: client.cpf,
            emailCliente: client.email,
            foneCliente: client.phone,
            cepCliente: client.cep,
            logradouroCliente: client.address,
            numeroCliente: client.number,
            complementoCliente: client.complement,
            bairroCliente: client.neighborhood,
            cidadeCliente: client.city,
            ufCliente: client.state
        });
        await newClient.save();
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        dialog.showMessageBox(senderWindow, {
            type: 'info',
            title: "Aviso",
            message: "Cliente adicionado com sucesso!",
            buttons: ['OK']
        }).then((result) => {
            if (result.response === 0) {
                event.reply('reset-form');
            }
        });
    } catch (error) {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (error.code === 11000) { // Duplicate key error (CPF)
            dialog.showMessageBox(senderWindow, {
                type: 'error',
                title: "Atenção!",
                message: "CPF já cadastrado.\nVerifique o número digitado.",
                buttons: ['OK']
            }).then((result) => {
                if (result.response === 0) {
                    event.reply('cpf-duplicate-error');
                }
            });
        } else {
            console.error("Erro ao cadastrar cliente:", error);
            dialog.showMessageBox(senderWindow, {
                type: 'error',
                title: "Erro",
                message: "Ocorreu um erro ao cadastrar o cliente.\nPor favor, tente novamente.",
                buttons: ['OK']
            });
        }
    }
});

// == Fim - Clientes - CRUD Create
// ============================================================

// ============================================================
// == Clientes - CRUD Update (INALETERADO, apenas confirmação)
ipcMain.on('update-client', async (event, id, client) => {
    console.log("Recebido cliente para atualização:", id, client);
    try {
        const updatedClient = await clientModel.findByIdAndUpdate(id, {
            nomeCliente: client.name,
            cpfCliente: client.cpf,
            emailCliente: client.email,
            foneCliente: client.phone,
            cepCliente: client.cep,
            logradouroCliente: client.address,
            numeroCliente: client.number,
            complementoCliente: client.complement,
            bairroCliente: client.neighborhood,
            cidadeCliente: client.city,
            ufCliente: client.state
        }, { new: true }); // { new: true } retorna o documento atualizado

        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        dialog.showMessageBox(senderWindow, {
            type: 'info',
            title: "Aviso",
            message: "Cliente atualizado com sucesso!",
            buttons: ['OK']
        }).then((result) => {
            if (result.response === 0) {
                event.reply('reset-form');
            }
        });

    } catch (error) {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (error.code === 11000) { // Duplicate key error (CPF)
            dialog.showMessageBox(senderWindow, {
                type: 'error',
                title: "Atenção!",
                message: "CPF já cadastrado.\nVerifique o número digitado.",
                buttons: ['OK']
            }).then((result) => {
                if (result.response === 0) {
                    event.reply('cpf-duplicate-error');
                }
            });
        } else {
            console.error("Erro ao atualizar cliente:", error);
            dialog.showMessageBox(senderWindow, {
                type: 'error',
                title: "Erro",
                message: "Ocorreu um erro ao atualizar o cliente.\nPor favor, tente novamente.",
                buttons: ['OK']
            });
        }
    }
});
// == Fim - Clientes - CRUD Update
// ============================================================


// ============================================================
// == Relatório de clientes =================================== (INALETERADO)
async function relatorioClientes() {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        doc.setFontSize(10);
        doc.text(`Data: ${dataAtual}`, 170, 15);
        doc.setFontSize(18);
        doc.text("Relatório de clientes", 15, 30);
        doc.setFontSize(12);
        let y = 50;
        doc.text("Nome", 14, y);
        doc.text("Telefone", 85, y);
        doc.text("E-mail", 130, y);
        y += 5;
        doc.setLineWidth(0.5);
        doc.line(10, y, 200, y);
        y += 10;

        const clientes = await clientModel.find().sort({ nomeCliente: 1 });
        clientes.forEach((c) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.text("Nome", 14, y);
                doc.text("Telefone", 85, y);
                doc.text("E-mail", 130, y);
                y += 5;
                doc.setLineWidth(0.5);
                doc.line(10, y, 200, y);
                y += 10;
            }
            doc.text(c.nomeCliente, 15, y);
            doc.text(c.foneCliente, 85, y);
            doc.text(c.emailCliente, 130, y);
            y += 10;
        });

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pages}`, 105, 290, { align: 'center' });
        }

        const tempDir = app.getPath('temp');
        const filePath = path.join(tempDir, 'clientes.pdf');
        doc.save(filePath);
        shell.openPath(filePath);
    } catch (error) {
        console.error("Erro ao gerar relatório de clientes:", error);
        dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
            type: 'error',
            title: "Erro no Relatório",
            message: "Ocorreu um erro ao gerar o relatório de clientes.\nPor favor, tente novamente.",
            buttons: ['OK']
        });
    }
}
// == Fim - relatório de clientes =============================
// ============================================================


// ============================================================
// == Crud Read =============================================== (INALETERADO)

ipcMain.on('validate-search', () => {
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'warning',
        title: 'Atenção',
        message: 'Preencha o campo de busca para pesquisar.',
        buttons: ['OK']
    });
});

ipcMain.on('search-name', async (event, searchInput) => {
    console.log("Search input received:", searchInput);
    const senderWindow = BrowserWindow.fromWebContents(event.sender);

    const isPotentiallyCPF = (value) => {
        if (!value) return false;
        const cleaned = String(value).replace(/\D/g, '');
        return cleaned.length === 11;
    };

    try {
        let clientData;
        if (isPotentiallyCPF(searchInput)) {
            const cleanedCPF = String(searchInput).replace(/\D/g, '');
            console.log("Searching by CPF:", cleanedCPF);
            clientData = await clientModel.find({ cpfCliente: cleanedCPF });

            if (clientData.length === 0) {
                dialog.showMessageBox(senderWindow, {
                    type: 'info',
                    title: 'Aviso',
                    message: 'CPF não encontrado.',
                    buttons: ['OK']
                }).then(() => {
                    event.reply('reset-form');
                });
                return;
            } else {
                console.log("CPF found:", clientData);
                // Converte Mongoose Document para Plain Object para enviar ao renderizador
                event.reply('render-client', JSON.stringify(clientData[0].toObject())); // Envia o primeiro resultado como objeto
            }
        } else {
            console.log("Searching by Name:", searchInput);
            clientData = await clientModel.find({
                nomeCliente: new RegExp(searchInput, 'i')
            });

            if (clientData.length === 0) {
                dialog.showMessageBox(senderWindow, {
                    type: 'warning',
                    title: 'Aviso',
                    message: `Cliente "${searchInput}" não cadastrado.\nDeseja cadastrar este cliente?`,
                    defaultId: 0,
                    buttons: ['Sim', 'Não']
                }).then((result) => {
                    if (result.response === 0) {
                        event.reply('set-name', searchInput);
                    } else {
                        event.reply('reset-form');
                    }
                });
            } else {
                console.log("Name found:", clientData);
                // Se múltiplos resultados, envia o primeiro. Pode ser ajustado para exibir lista.
                event.reply('render-client', JSON.stringify(clientData[0].toObject()));
            }
        }
    } catch (error) {
        console.error("Erro durante a busca:", error);
        dialog.showMessageBox(senderWindow, {
            type: 'error',
            title: "Erro na Busca",
            message: "Ocorreu um erro ao realizar a busca.\nPor favor, tente novamente.",
            buttons: ['OK']
        });
    }
});
// == Fim - Crud Read =========================================
// ============================================================


// ============================================================
// == CRUD Delete ============================================= (INALETERADO)

ipcMain.on('delete-client', async (event, id) => {
    console.log("Pedido de exclusão para o ID:", id);
    const senderWindow = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showMessageBox(senderWindow, {
        type: 'warning',
        title: "Atenção!",
        message: "Tem certeza que deseja excluir este cliente?\nEsta ação não poderá ser desfeita.",
        buttons: ['Cancelar', 'Excluir']
    });

    if (result.response === 1) { // Se o usuário clicou em 'Excluir'
        try {
            const delClient = await clientModel.findByIdAndDelete(id);
            if (delClient) {
                dialog.showMessageBox(senderWindow, {
                    type: 'info',
                    title: "Sucesso",
                    message: "Cliente excluído com sucesso!",
                    buttons: ['OK']
                }).then(() => {
                    event.reply('reset-form');
                });
            } else {
                dialog.showMessageBox(senderWindow, {
                    type: 'error',
                    title: "Erro",
                    message: "Cliente não encontrado para exclusão.",
                    buttons: ['OK']
                });
            }
        } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            dialog.showMessageBox(senderWindow, {
                type: 'error',
                title: "Erro",
                message: "Ocorreu um erro ao excluir o cliente.\nPor favor, tente novamente.",
                buttons: ['OK']
            });
        }
    }
});
// == Fim - Crud delete =======================================
// ============================================================