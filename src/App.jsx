import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import 'leaflet/dist/leaflet.css';
import './App.css';

const App = () => {
  const position = [-26.292977, -48.848306];

  const categories = ["alimentação", "abrigo", "emergencia", "centro_de_ajuda", "caps"];

  const [markers, setMarkers] = useState([]);

  const [activeFilters, setActiveFilters] = useState({
    alimentação: true,
    abrigo: true,
    emergencia: true,
    centro_de_ajuda: true,
    caps: true,
  });

  const [showFilters, setShowFilters] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isAddingMarker, setIsAddingMarker] = useState(false);

  const [newMarker, setNewMarker] = useState({
    position: null,
    title: '',
    description: '',
    category: categories[0],
    hours: [],
    info: '',
  });

  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'locais'));
        const markersData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          markersData.push({
            id: doc.id,
            position: [data.latitude, data.longitude],
            title: data.nome,
            description: data.descricao,
            category: data.categoria,
            hours: data.hours || [],
            info: data.info || '',
          });
        });
        setMarkers(markersData);
      } catch (error) {
        console.error('Erro ao buscar marcadores:', error);
      }
    };

    fetchMarkers();
  }, []);

  const handleFilterChange = (category) => {
    setActiveFilters((prevFilters) => ({
      ...prevFilters,
      [category]: !prevFilters[category],
    }));
  };

  const toggleFilters = () => {
    if (showFilters) {
      document.body.style.overflow = 'auto';
    } else {
      document.body.style.overflow = 'hidden';
    }
    setShowFilters(!showFilters);
  };

  const filteredMarkers = markers.filter((marker) => {
    const categoryKey = marker.category;
    return activeFilters[categoryKey];
  });

  const handleMapClick = (e) => {
    if (isAddingMarker) {
      setNewMarker((prev) => ({
        ...prev,
        position: [e.latlng.lat, e.latlng.lng],
      }));
      setShowModal(true);
      setIsAddingMarker(false);
    }
  };

  const handleAddMarker = () => {
    setIsAddingMarker(true);
  };

  const handleCancel = () => {
    setNewMarker({
      position: null,
      title: '',
      description: '',
      category: categories[0],
      hours: [],
      info: '',
    });
    setShowModal(false);
    setIsAddingMarker(false);
  };

  const handleSaveMarker = async () => {
    if (newMarker.title && newMarker.position) {
      try {
        const markerData = {
          nome: newMarker.title,
          descricao: newMarker.description,
          categoria: newMarker.category,
          latitude: newMarker.position[0],
          longitude: newMarker.position[1],
          hours: newMarker.hours,
          info: newMarker.info,
        };

        await addDoc(collection(db, 'locais'), markerData);

        const newMarkerData = {
          position: newMarker.position,
          title: newMarker.title,
          description: newMarker.description,
          category: newMarker.category,
          hours: newMarker.hours,
          info: newMarker.info,
        };
        setMarkers((prevMarkers) => [...prevMarkers, newMarkerData]);

        setShowModal(false);
        setIsAddingMarker(false);
        setNewMarker({
          position: null,
          title: '',
          description: '',
          category: categories[0],
          hours: [],
          info: '',
        });
      } catch (error) {
        console.error('Erro ao salvar marcador:', error);
        alert('Erro ao salvar marcador. Tente novamente.');
      }
    } else {
      alert('Por favor, preencha todos os campos obrigatórios.');
    }
  };

  const handleAddSchedule = () => {
    setNewMarker((prev) => ({
      ...prev,
      hours: [...prev.hours, { from: '', to: '' }],
    }));
  };

  const handleScheduleChange = (index, field, value) => {
    const updatedHours = [...newMarker.hours];
    updatedHours[index][field] = value;
    setNewMarker((prev) => ({ ...prev, hours: updatedHours }));
  };

  const SetMapBounds = ({ bounds }) => {
    const map = useMap();
    map.setMaxBounds(bounds);
    map.on('click', handleMapClick);
    return null;
  };

  return (
    <div className="app-container">
      <button className="toggle-filters-button" onClick={toggleFilters}>
        {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
      </button>

      {showFilters && (
        <div className="filter-box">
          <h1 className="project-title">Conectar e Ajudar: Mapa Solidário</h1>
          {categories.map((category, index) => (
            <label key={index}>
              <input
                type="checkbox"
                name={category}
                checked={activeFilters[category]}
                onChange={() => handleFilterChange(category)}
              /> {category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
          ))}
          <button className="add-marker-button" onClick={handleAddMarker}>
            Adicionar Marcador
          </button>
        </div>
      )}

      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <SetMapBounds bounds={[[-26.6, -49.2], [-25.8, -48.5]]} />
        {filteredMarkers.map((marker, index) => (
          <Marker key={marker.id || index} position={marker.position}>
            <Popup>
              <div className="leaflet-popup-content">
                <h2>{marker.title}</h2>
                <p>{marker.description}</p>
                <p><strong>Horário:</strong> {marker.hours.map(h => `${h.from} - ${h.to}`).join(', ')}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Adicionar Marcador</h2>
            <label>
              Título:
              <input
                type="text"
                value={newMarker.title}
                onChange={(e) => setNewMarker({ ...newMarker, title: e.target.value })}
              />
            </label>
            <label>
              Descrição:
              <input
                type="text"
                value={newMarker.description}
                onChange={(e) => setNewMarker({ ...newMarker, description: e.target.value })}
              />
            </label>
            <label>
              Categoria:
              <select
                value={newMarker.category}
                onChange={(e) => setNewMarker({ ...newMarker, category: e.target.value })}
              >
                {categories.map((cat, index) => (
                  <option key={index} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label>
              Horários de Atendimento:
              {newMarker.hours.map((schedule, index) => (
                <div key={index}>
                  <input
                    type="time"
                    value={schedule.from}
                    onChange={(e) => handleScheduleChange(index, 'from', e.target.value)}
                  />
                  <span> até </span>
                  <input
                    type="time"
                    value={schedule.to}
                    onChange={(e) => handleScheduleChange(index, 'to', e.target.value)}
                  />
                </div>
              ))}
              <button type="button" onClick={handleAddSchedule}>Adicionar Turno</button>
            </label>
            <label>
              Informações Adicionais:
              <input
                type="text"
                value={newMarker.info}
                onChange={(e) => setNewMarker({ ...newMarker, info: e.target.value })}
              />
            </label>
            <button onClick={handleSaveMarker}>Salvar</button>
            <button onClick={handleCancel}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
