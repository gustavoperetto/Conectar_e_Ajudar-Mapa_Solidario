import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { db } from './firebaseConfig';
import 'leaflet/dist/leaflet.css';
import './App.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const App = () => {
  const position = [-26.292977, -48.848306];

  const [categories, setCategories] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});

  const [showFilters, setShowFilters] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [markerToDelete, setMarkerToDelete] = useState(null);

  const [newMarker, setNewMarker] = useState({
    position: null,
    title: '',
    description: '',
    category: '',
    hours: [{ from: '', to: '' }],
    info: '',
  });

  const getEmptyMarker = useCallback(() => ({
    position: null,
    title: '',
    description: '',
    category: categories.length > 0 ? categories[0].id : '',
    hours: [{ from: '', to: '' }],
    info: '',
  }), [categories]);

  const resetNewMarker = useCallback(() => {
    setNewMarker(getEmptyMarker());
  }, [getEmptyMarker]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'categorias'));
        const categoriesData = [];
        const filters = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const categoryId = data.id || doc.id;
          categoriesData.push({
            id: categoryId,
            nome: data.nome,
            descricao: data.descricao || '',
          });
          filters[categoryId] = true;
        });
        setCategories(categoriesData);
        setActiveFilters(filters);
        if (categoriesData.length > 0) {
          setNewMarker((prev) => {
            if (!prev.category) {
              return {
                ...prev,
                category: categoriesData[0].id,
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
      }
    };

    fetchCategories();
  }, []);

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

  useEffect(() => {
    if (isAddingMarker) {
      document.body.classList.add('map-add-marker-cursor');
    } else {
      document.body.classList.remove('map-add-marker-cursor');
    }
    return () => {
      document.body.classList.remove('map-add-marker-cursor');
    };
  }, [isAddingMarker]);

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

  const handleMapClick = useCallback((e) => {
    if (isAddingMarker) {
      setNewMarker((prev) => ({
        ...prev,
        position: [e.latlng.lat, e.latlng.lng],
      }));
      setShowModal(true);
      setIsAddingMarker(false);
    }
  }, [isAddingMarker]);

  const handleToggleAddMarker = () => {
    if (isAddingMarker) {
      setIsAddingMarker(false);
      resetNewMarker();
    } else {
      resetNewMarker();
      setIsAddingMarker(true);
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    resetNewMarker();
    setShowModal(false);
    setIsAddingMarker(false);
    setEditingMarkerId(null);
  };

  const handleEditMarker = (marker) => {
    setEditingMarkerId(marker.id);
    setNewMarker({
      position: marker.position,
      title: marker.title,
      description: marker.description,
      category: marker.category,
      hours: marker.hours && marker.hours.length > 0 ? marker.hours : [{ from: '', to: '' }],
      info: marker.info || '',
    });
    setShowModal(true);
  };

  const handleDeleteMarker = (marker) => {
    setMarkerToDelete(marker);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (markerToDelete) {
      try {
        await deleteDoc(doc(db, 'locais', markerToDelete.id));
        setMarkers((prevMarkers) => prevMarkers.filter(m => m.id !== markerToDelete.id));
        setShowDeleteModal(false);
        setMarkerToDelete(null);
      } catch (error) {
        console.error('Erro ao excluir marcador:', error);
        alert('Erro ao excluir marcador. Tente novamente.');
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setMarkerToDelete(null);
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

        if (editingMarkerId) {
          await updateDoc(doc(db, 'locais', editingMarkerId), markerData);
          setMarkers((prevMarkers) =>
            prevMarkers.map((m) =>
              m.id === editingMarkerId
                ? {
                    ...m,
                    position: newMarker.position,
                    title: newMarker.title,
                    description: newMarker.description,
                    category: newMarker.category,
                    hours: newMarker.hours,
                    info: newMarker.info,
                  }
                : m
            )
          );
          setEditingMarkerId(null);
        } else {
          const docRef = await addDoc(collection(db, 'locais'), markerData);
          const newMarkerData = {
            id: docRef.id,
            position: newMarker.position,
            title: newMarker.title,
            description: newMarker.description,
            category: newMarker.category,
            hours: newMarker.hours,
            info: newMarker.info,
          };
          setMarkers((prevMarkers) => [...prevMarkers, newMarkerData]);
        }

        setShowModal(false);
        setIsAddingMarker(false);
        resetNewMarker();
      } catch (error) {
        console.error('Erro ao salvar marcador:', error);
        alert('Erro ao salvar marcador. Tente novamente.');
      }
    } else {
      alert('Por favor, preencha todos os campos obrigatórios.');
    }
  };

  const handleAddSchedule = () => {
    setNewMarker((prev) => {
      if (prev.hours.length < 7) {
        return {
          ...prev,
          hours: [...prev.hours, { from: '', to: '' }],
        };
      }
      return prev;
    });
  };

  const handleRemoveSchedule = (index) => {
    setNewMarker((prev) => {
      if (prev.hours.length > 1) {
        const updatedHours = prev.hours.filter((_, i) => i !== index);
        return {
          ...prev,
          hours: updatedHours,
        };
      }
      return prev;
    });
  };

  const handleScheduleChange = (index, field, value) => {
    const updatedHours = [...newMarker.hours];
    updatedHours[index][field] = value;
    setNewMarker((prev) => ({ ...prev, hours: updatedHours }));
  };

  const SetMapBounds = ({ bounds, onMapClick, isAdding }) => {
    const map = useMap();
    
    useEffect(() => {
      map.setMaxBounds(bounds);
    }, [map, bounds]);

    useEffect(() => {
      if (isAdding) {
        const handleClick = (e) => {
          onMapClick(e);
        };
        map.on('click', handleClick);
        return () => {
          map.off('click', handleClick);
        };
      }
    }, [map, isAdding, onMapClick]);

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
          {categories.map((category) => (
            <label key={category.id}>
              <input
                type="checkbox"
                name={category.id}
                checked={activeFilters[category.id] || false}
                onChange={() => handleFilterChange(category.id)}
              /> {category.nome}
            </label>
          ))}
          <button className="add-marker-button" onClick={handleToggleAddMarker}>
            {isAddingMarker ? 'Cancelar' : 'Adicionar Marcador'}
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
        <SetMapBounds 
          bounds={[[-26.6, -49.2], [-25.8, -48.5]]} 
          onMapClick={handleMapClick}
          isAdding={isAddingMarker}
        />
        {filteredMarkers.map((marker, index) => (
          <Marker key={marker.id || index} position={marker.position}>
            <Popup>
              <div className="leaflet-popup-content">
                <h2>{marker.title}</h2>
                <p>{marker.description}</p>
                <p><strong>Horário:</strong> {marker.hours.map(h => `${h.from} - ${h.to}`).join(', ')}</p>
                <div className="popup-actions">
                  <button
                    onClick={() => handleEditMarker(marker)}
                    className="popup-button-edit"
                    title="Editar marcador"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteMarker(marker)}
                    className="popup-button-delete"
                    title="Excluir marcador"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Excluir
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingMarkerId ? 'Editar Marcador' : 'Adicionar Marcador'}</h2>
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
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Horários de Atendimento:
              {newMarker.hours.map((schedule, index) => (
                <div key={index} className="schedule-item">
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
                  {newMarker.hours.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSchedule(index)}
                      className="remove-schedule-button"
                      title="Remover turno"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {newMarker.hours.length < 7 && (
                <button type="button" onClick={handleAddSchedule}>Adicionar Turno</button>
              )}
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

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmar Exclusão</h2>
            <p>Realmente deseja excluir este marcador?</p>
            <div className="delete-modal-actions">
              <button
                onClick={handleConfirmDelete}
                className="delete-button-confirm"
              >
                Confirmar
              </button>
              <button
                onClick={handleCancelDelete}
                className="delete-button-cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
