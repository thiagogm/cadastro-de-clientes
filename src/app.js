import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client'; // Importar ReactDOM

// Main App component
const App = () => {
    // State variables for form data, errors, messages, and customer list
    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        cep: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        email: '',
        phone: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentCustomerId, setCurrentCustomerId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [modalAction, setModalAction] = useState(''); // 'edit', 'register', 'delete'
    const [tempCustomerData, setTempCustomerData] = useState(null); // Data found during search
    const [tempSearchValue, setTempSearchValue] = useState(''); // Value from search input
    const [modalMessage, setModalMessage] = useState('');

    // Refs for input fields to manage focus and styling
    const cpfInputRef = useRef(null);
    const searchInputRef = useRef(null);

    // Effect to clear messages after a delay
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage('');
            }, 5000); // Clear message after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [message]);

    // IPC Renderer Listeners (Electron communication)
    useEffect(() => {
        // Listener for form reset from main process (after create/delete/update)
        window.api.resetForm(() => {
            resetForm();
            setMessage('Operação realizada com sucesso!');
        });

        // Listener for rendering client data after search
        window.api.renderClient((event, clientJson) => {
            const clientData = JSON.parse(clientJson);
            // Assuming clientData is an array, take the first element for rendering
            const client = clientData[0];
            if (client) {
                setTempCustomerData(client);
                setModalAction('edit');
                setModalMessage('Cliente já cadastrado. Deseja editar os dados?');
                setShowConfirmationModal(true);
            }
        });

        // Listener for setting name after search (if not found)
        window.api.setName((event, name) => {
            setTempSearchValue(name); // Store the name that was searched
            setModalAction('register');
            setModalMessage(`Cliente "${name}" não cadastrado. Deseja cadastrá-lo?`);
            setShowConfirmationModal(true);
        });

        // Listener for CPF duplicate error from main process
        window.api.onCpfDuplicateError(() => {
            if (cpfInputRef.current) {
                setErrors(prev => ({ ...prev, cpf: 'CPF já cadastrado.' })); // Set error message
                cpfInputRef.current.value = ''; // Clear CPF field
                cpfInputRef.current.focus(); // Focus on CPF field
                cpfInputRef.current.classList.add('border-red-500', 'ring-red-500'); // Add red border
                setMessage('Erro: CPF já cadastrado. Por favor, verifique.');
            }
        });

        // Cleanup function for event listeners (important for Electron IPC)
        return () => {
            // Remove listeners to prevent memory leaks in Electron
            // Note: For 'on' listeners, you typically store the handler and use removeListener
            // For simplicity in this example, assuming the component unmounts cleanly
            // or the listeners are not added multiple times in a way that causes issues.
            // A more robust solution would involve:
            // const resetHandler = () => { /* ... */ };
            // window.api.resetForm(resetHandler);
            // return () => window.api.removeListener('reset-form', resetHandler);
        };
    }, []); // Empty dependency array means this runs once on mount

    // Function to handle input changes in the form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for the field when it's being typed into
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        // Remove red border from CPF if user starts typing
        if (name === 'cpf' && cpfInputRef.current && cpfInputRef.current.classList.contains('border-red-500')) {
            cpfInputRef.current.classList.remove('border-red-500', 'ring-red-500');
        }
    };

    // Function to handle changes in the search input
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // CPF validation function (basic format and checksum)
    const validateCPF = (cpf) => {
        cpf = String(cpf).replace(/[^\d]+/g, ''); // Remove non-digits
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
        let sum = 0;
        let remainder;
        for (let i = 1; i <= 9; i++) {
            sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if ((remainder === 10) || (remainder === 11)) {
            remainder = 0;
        }
        if (remainder !== parseInt(cpf.substring(9, 10))) {
            return false;
        }
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        remainder = (sum * 10) % 11;
        if ((remainder === 10) || (remainder === 11)) {
            remainder = 0;
        }
        if (remainder !== parseInt(cpf.substring(10, 11))) {
            return false;
        }
        return true;
    };

    // Function to fetch address details from ViaCEP API
    const fetchAddressByCEP = async (cepValue) => {
        const cleanedCep = cepValue.replace(/\D/g, '');
        if (cleanedCep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }));
                    setErrors(prev => ({ ...prev, cep: '' })); // Clear CEP error on success
                } else {
                    setErrors(prev => ({ ...prev, cep: 'CEP não encontrado.' }));
                    setFormData(prev => ({ ...prev, address: '', neighborhood: '', city: '', state: '' }));
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
                setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP. Tente novamente.' }));
                setFormData(prev => ({ ...prev, address: '', neighborhood: '', city: '', state: '' }));
            }
        } else {
            setErrors(prev => ({ ...prev, cep: 'CEP inválido (8 dígitos numéricos).' }));
        }
    };

    // Handle blur event for CEP field
    const handleCepBlur = (e) => {
        fetchAddressByCEP(e.target.value);
    };

    // Form validation before submission
    const validateForm = () => {
        let newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório.';
        if (!formData.cpf.trim()) {
            newErrors.cpf = 'CPF é obrigatório.';
        } else if (!validateCPF(formData.cpf)) {
            newErrors.cpf = 'CPF inválido.';
        }
        if (!formData.email.trim()) newErrors.email = 'Email é obrigatório.';
        if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido.';
        if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório.';
        if (!formData.cep.trim()) {
            newErrors.cep = 'CEP é obrigatório.';
        } else if (formData.cep.replace(/\D/g, '').length !== 8) {
            newErrors.cep = 'CEP inválido (8 dígitos).';
        }
        if (!formData.address.trim()) newErrors.address = 'Endereço é obrigatório.';
        if (!formData.number.trim()) newErrors.number = 'Número é obrigatório.';
        if (!formData.neighborhood.trim()) newErrors.neighborhood = 'Bairro é obrigatório.';
        if (!formData.city.trim()) newErrors.city = 'Cidade é obrigatória.';
        if (!formData.state.trim()) newErrors.state = 'UF é obrigatória.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Reset form to initial state
    const resetForm = () => {
        setFormData({
            name: '',
            cpf: '',
            cep: '',
            address: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            email: '',
            phone: ''
        });
        setErrors({});
        setIsEditing(false);
        setCurrentCustomerId(null);
        setSearchQuery('');
        setTempCustomerData(null);
        setTempSearchValue('');
        if (cpfInputRef.current) {
            cpfInputRef.current.classList.remove('border-red-500', 'ring-red-500');
        }
    };

    // Handle form submission (Create/Update)
    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            const clientData = {
                name: formData.name,
                cpf: formData.cpf.replace(/\D/g, ''), // Clean CPF before sending
                email: formData.email,
                phone: formData.phone,
                cep: formData.cep.replace(/\D/g, ''), // Clean CEP before sending
                address: formData.address,
                number: formData.number,
                complement: formData.complement,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state
            };

            if (isEditing && currentCustomerId) {
                window.api.updateClient(currentCustomerId, clientData);
            } else {
                window.api.newClient(clientData);
            }
        } else {
            setMessage('Por favor, corrija os erros no formulário.');
        }
    };

    // Handle client search
    const handleSearch = () => {
        if (!searchQuery.trim()) {
            window.api.validateSearch(); // Trigger Electron dialog
            return;
        }

        // Validate CPF if the search query looks like one
        const cleanedSearchQuery = searchQuery.replace(/\D/g, '');
        if (cleanedSearchQuery.length === 11 && !validateCPF(cleanedSearchQuery)) {
            setErrors({ ...errors, search: 'CPF de busca inválido.' });
            setMessage('CPF de busca inválido.');
            if (searchInputRef.current) {
                searchInputRef.current.classList.add('border-red-500', 'ring-red-500');
            }
            return;
        } else {
            setErrors(prev => ({ ...prev, search: '' }));
            if (searchInputRef.current) {
                searchInputRef.current.classList.remove('border-red-500', 'ring-red-500');
            }
        }

        window.api.searchName(searchQuery);
    };

    // Handle delete client
    const handleDelete = () => {
        if (currentCustomerId) {
            setModalAction('delete');
            setModalMessage('Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita.');
            setShowConfirmationModal(true);
        } else {
            setMessage('Selecione um cliente para excluir.');
        }
    };

    // Handle modal confirmation
    const handleModalConfirm = () => {
        setShowConfirmationModal(false);
        if (modalAction === 'edit' && tempCustomerData) {
            setIsEditing(true);
            setCurrentCustomerId(tempCustomerData._id);
            setFormData({
                name: tempCustomerData.nomeCliente || '',
                cpf: tempCustomerData.cpfCliente || '',
                cep: tempCustomerData.cepCliente || '',
                address: tempCustomerData.logradouroCliente || '',
                number: tempCustomerData.numeroCliente || '',
                complement: tempCustomerData.complementoCliente || '',
                neighborhood: tempCustomerData.bairroCliente || '',
                city: tempCustomerData.cidadeCliente || '',
                state: tempCustomerData.ufCliente || '',
                email: tempCustomerData.emailCliente || '',
                phone: tempCustomerData.foneCliente || ''
            });
            setMessage('Dados do cliente carregados para edição.');
        } else if (modalAction === 'register' && tempSearchValue) {
            resetForm(); // Clear existing form data
            setFormData(prev => ({ ...prev, name: tempSearchValue }));
            setMessage(`Pronto para cadastrar "${tempSearchValue}".`);
        } else if (modalAction === 'delete' && currentCustomerId) {
            window.api.deleteClient(currentCustomerId);
        }
        setTempCustomerData(null);
        setTempSearchValue('');
    };

    // Handle modal cancellation
    const handleModalCancel = () => {
        setShowConfirmationModal(false);
        setTempCustomerData(null);
        setTempSearchValue('');
        resetForm(); // Reset form if user cancels action
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Cadastro de Clientes</h1>

            {/* Message Display */}
            {message && (
                <div className={`p-3 mb-4 rounded-md text-center ${message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}

            {/* Search Section */}
            <div className="mb-6 flex items-center space-x-4">
                <input
                    type="text"
                    placeholder="Buscar por Nome ou CPF"
                    className={`flex-grow p-3 border rounded-md focus:outline-none focus:ring-2 ${errors.search ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    ref={searchInputRef}
                />
                <button
                    onClick={handleSearch}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-300 ease-in-out"
                >
                    Buscar
                </button>
                <button
                    onClick={resetForm}
                    className="px-6 py-3 bg-gray-400 text-white font-semibold rounded-md shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75 transition duration-300 ease-in-out"
                >
                    Limpar
                </button>
            </div>
            {errors.search && <p className="text-red-500 text-sm mb-4 -mt-2">{errors.search}</p>}


            {/* Client Form */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* CPF */}
                <div>
                    <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <input
                        type="text"
                        id="cpf"
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleChange}
                        onBlur={(e) => {
                            if (e.target.value && !validateCPF(e.target.value)) {
                                setErrors(prev => ({ ...prev, cpf: 'CPF inválido.' }));
                                setMessage('CPF inválido. Por favor, verifique.');
                                if (cpfInputRef.current) {
                                    cpfInputRef.current.classList.add('border-red-500', 'ring-red-500');
                                }
                            } else {
                                setErrors(prev => ({ ...prev, cpf: '' }));
                                if (cpfInputRef.current) {
                                    cpfInputRef.current.classList.remove('border-red-500', 'ring-red-500');
                                }
                            }
                        }}
                        maxLength="14" // 11 digits + 2 dots + 1 hyphen
                        placeholder="000.000.000-00"
                        className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 ${errors.cpf ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                        ref={cpfInputRef}
                    />
                    {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength="15" // (99) 99999-9999
                        placeholder="(99) 99999-9999"
                        className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 ${errors.phone ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                {/* CEP */}
                <div>
                    <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <input
                        type="text"
                        id="cep"
                        name="cep"
                        value={formData.cep}
                        onChange={handleChange}
                        onBlur={handleCepBlur}
                        maxLength="9" // 8 digits + 1 hyphen
                        placeholder="00000-000"
                        className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 ${errors.cep ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                    />
                    {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep}</p>}
                </div>

                {/* Address */}
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-md bg-gray-50 focus:outline-none ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                        readOnly // Filled by CEP
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>

                {/* Number */}
                <div>
                    <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                    <input
                        type="text"
                        id="number"
                        name="number"
                        value={formData.number}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 ${errors.number ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                    />
                    {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number}</p>}
                </div>

                {/* Complement */}
                <div>
                    <label htmlFor="complement" className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                    <input
                        type="text"
                        id="complement"
                        name="complement"
                        value={formData.complement}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Neighborhood */}
                <div>
                    <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                    <input
                        type="text"
                        id="neighborhood"
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-md bg-gray-50 focus:outline-none ${errors.neighborhood ? 'border-red-500' : 'border-gray-300'}`}
                        readOnly // Filled by CEP
                    />
                    {errors.neighborhood && <p className="text-red-500 text-xs mt-1">{errors.neighborhood}</p>}
                </div>

                {/* City */}
                <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-md bg-gray-50 focus:outline-none ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                        readOnly // Filled by CEP
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>

                {/* State (UF) */}
                <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                    <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        maxLength="2"
                        className={`w-full p-3 border rounded-md bg-gray-50 focus:outline-none ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
                        readOnly // Filled by CEP
                    />
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                </div>

                {/* Form Actions */}
                <div className="md:col-span-2 flex justify-end space-x-4 mt-6">
                    <button
                        type="submit"
                        className="px-8 py-3 bg-green-600 text-white font-semibold rounded-md shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-300 ease-in-out"
                    >
                        {isEditing ? 'Atualizar' : 'Cadastrar'}
                    </button>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-md shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition duration-300 ease-in-out"
                        >
                            Excluir
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={resetForm}
                        className="px-8 py-3 bg-gray-500 text-white font-semibold rounded-md shadow-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-300 ease-in-out"
                    >
                        Cancelar
                    </button>
                </div>
            </form>

            {/* Custom Confirmation Modal */}
            {showConfirmationModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <p className="text-lg font-semibold text-gray-800 mb-6">{modalMessage}</p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handleModalConfirm}
                                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                            >
                                Sim
                            </button>
                            <button
                                onClick={handleModalCancel}
                                className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                            >
                                Não
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Adicionar esta parte para renderizar o componente App
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error("Elemento React com id 'root' não foi encontrado no DOM. Verifique seu arquivo HTML.");
}

// export default App; // O export default não é estritamente necessário se este é o ponto de entrada principal do bundle