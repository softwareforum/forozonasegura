import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FaFlag } from 'react-icons/fa';
import ReplyForm from '../components/ReplyForm';
import PostsMapView from '../components/maps/PostsMapView';
import ReportModal from '../components/ReportModal';
import StarRating from '../components/ui/StarRating';
import { 
  SERVICIOS_OPTIONS, 
  ANFITRION_VICIOS_OPTIONS, 
  ANFITRION_ACOSO_OPTIONS, 
  ANFITRION_CARACTER_OPTIONS 
} from '../constants/postFormOptions';
import { getActiveServiceKeys, normalizeServiceKey } from '../utils/services';
import { slugify } from '../utils/slug';
import { resolveCcaaSlugByProvincia } from '../constants/provinceToCcaa';
import './PostDetail.css';

// Helper para obtener label de servicio por key
const getServicioLabel = (key) => {
  const normalizedKey = normalizeServiceKey(key);
  const servicio = SERVICIOS_OPTIONS.find(s => s.key === normalizedKey);
  return servicio ? servicio.label : key;
};

// Helper para obtener label de anfitriÃ³n
const getAnfitrionLabel = (field, value) => {
  let options = [];
  if (field === 'tieneVicios') options = ANFITRION_VICIOS_OPTIONS;
  else if (field === 'acoso') options = ANFITRION_ACOSO_OPTIONS;
  else if (field === 'caracter') options = ANFITRION_CARACTER_OPTIONS;
  
  const option = options.find(o => o.value === value);
  return option ? option.label : value;
};

// Helper para obtener servicios activos desde objeto servicios
const getActiveServicios = (servicios) => {
  if (!servicios || typeof servicios !== 'object') return [];
  return getActiveServiceKeys(servicios);
};

// Helper para obtener servicios de reply con fallback robusto
const getReplyServicios = (reply) => {
  // Si reply.servicios es un objeto (nuevo formato), obtener keys activas
  if (reply?.servicios && typeof reply.servicios === 'object' && !Array.isArray(reply.servicios)) {
    return getActiveServicios(reply.servicios);
  }
  // Si reply.servicios es un array, usarlo directamente
  if (reply?.servicios && Array.isArray(reply.servicios)) {
    return reply.servicios;
  }
  // Si reply.amenities existe (legacy), usarlo
  if (reply?.amenities && Array.isArray(reply.amenities)) {
    return reply.amenities;
  }
  // Si reply.serviciosYCaracteristicas existe, usarlo
  if (reply?.serviciosYCaracteristicas && Array.isArray(reply.serviciosYCaracteristicas)) {
    return reply.serviciosYCaracteristicas;
  }
  // Si no hay nada, retornar array vacÃ­o
  return [];
};

// Helper para renderizar un servicio (puede ser string o key)
const renderServicio = (item, idx) => {
  // Si es string, puede ser:
  // 1. Un label ya en espaÃ±ol (mostrarlo tal cual)
  // 2. Una key legacy (mostrarlo tal cual tambiÃ©n)
  if (typeof item === 'string') {
    // Intentar obtener label desde SERVICIOS_OPTIONS
    const servicio = SERVICIOS_OPTIONS.find(s => s.key === normalizeServiceKey(item));
    if (servicio) {
      return servicio.label;
    }
    // Si no se encuentra, mostrar el string tal cual
    return item;
  }
  // Si no es string, intentar convertirlo
  return String(item);
};

const ThumbIcon = ({ direction = 'up', active = false }) => (
  <svg
    className="vote-thumb-icon"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    aria-hidden="true"
  >
    {direction === 'up' ? (
      <path
        d="M13 3l-1 5H8a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7l4-8a2 2 0 0 0-2-3h-3l1-5h-2zM4 10h2v9H4z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M11 21l1-5h4a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9L5 13a2 2 0 0 0 2 3h3l-1 5h2zM20 14h-2V5h2z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const VoteButton = ({
  direction,
  count,
  active,
  disabled,
  onClick,
  label
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`vote-btn vote-btn-${direction} ${active ? 'active' : ''}`}
    disabled={disabled}
    aria-label={label}
  >
    <ThumbIcon direction={direction} active={active} />
    <span>{count}</span>
  </button>
);

const PostDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const response = await axios.get(`/api/posts/${id}`);
      setPost(response.data.post);
    } catch (error) {
      console.error('Error obteniendo post:', error);
      setError('Publicación no encontrada');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (type) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await axios.post(`/api/posts/${id}/vote`, { type });
      fetchPost();
    } catch (error) {
      console.error('Error votando:', error);
    }
  };

  const handleReplyVote = async (replyId, type) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await axios.post(`/api/posts/${id}/replies/${replyId}/vote`, { type });
      fetchPost();
    } catch (error) {
      console.error('Error votando respuesta:', error);
    }
  };

  const handleReplyAdded = (newReply) => {
    if (newReply) {
      fetchPost();
    }
  };

  const handleReport = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsReportModalOpen(true);
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (error || !post) {
    return <div className="error">{error || 'Publicación no encontrada'}</div>;
  }

  const upvotes = post.votes?.upvotes?.length || 0;
  const downvotes = post.votes?.downvotes?.length || 0;
  const threadRatings = post.ratings || {};
  const hasThreadRatings = (threadRatings.count || 0) > 0;

  // Obtener servicios activos del post
  const activeServicios = getActiveServicios(post.servicios);

  // Helper para el link de volver
  const getBackLink = () => {
    const provincia = post.location?.provincia || post.community || '';
    const ccaaSlug = resolveCcaaSlugByProvincia(provincia);
    if (provincia && ccaaSlug) {
      return `/communities/${ccaaSlug}/${slugify(provincia)}`;
    }
    return '/communities';
  };

  return (
    <div className="post-detail">
      <Link to={getBackLink()} className="back-link">
        ← Volver
      </Link>

      <div className="post-detail-card">
        <div className="post-detail-header">
          <div>
            <div className="post-badges">
              <span className="badge badge-primary">{post.category}</span>
              {post.flags?.hasOpenReports && <span className="badge badge-warning">En revisión</span>}
              {post.flags?.hasApprovedReports && <span className="badge badge-danger">Reportado (confirmado)</span>}
              {post.isPinned && <span className="badge badge-warning">📌 Fijado</span>}
              {post.isLocked && <span className="badge badge-danger">🔒 Bloqueado</span>}
            </div>
            <h1>{post.title}</h1>
            {post.location?.geo?.label && (
              <div className="post-area-badge">Zona: {post.location.geo.label}</div>
            )}
            <div className="post-author-info">
              Por <Link to={`/profile/${post.author?._id || post.author}`}>{post.author?.username}</Link>
              {' • '}
              {new Date(post.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          <div className="post-actions">
            <div className="vote-buttons">
              <VoteButton
                direction="up"
                count={upvotes}
                active={post.votes?.upvotes?.some((v) => v.toString() === user?.id)}
                disabled={!user}
                onClick={() => handleVote('upvote')}
                label={user ? 'Votar positivo con pulgar arriba' : 'Inicia sesión para votar positivo'}
              />
              <VoteButton
                direction="down"
                count={downvotes}
                active={post.votes?.downvotes?.some((v) => v.toString() === user?.id)}
                disabled={!user}
                onClick={() => handleVote('downvote')}
                label={user ? 'Votar negativo con pulgar abajo' : 'Inicia sesión para votar negativo'}
              />
            </div>
            {user && (
              <button onClick={handleReport} className="btn btn-outline btn-sm">
                <FaFlag /> Reportar
              </button>
            )}
          </div>
        </div>

        <div className="post-content">
          {(post.location?.geo?.center?.coordinates ||
            (typeof post.location?.geo?.lat === 'number' && typeof post.location?.geo?.lng === 'number')) && (
            <div className="post-section">
              <h3 className="post-section-title">Mapa de zona</h3>
              <PostsMapView posts={[post]} height={300} />
            </div>
          )}

          {/* Ubicación */}
          {(post.location?.provincia || post.location?.municipioZona || post.street || post.city) && (
            <div className="post-section">
              <h3 className="post-section-title">Ubicación</h3>
              <div className="post-section-content">
                {post.location?.provincia && (
                  <div className="post-field">
                    <span className="post-field-label">Provincia:</span>
                    <span className="post-field-value">{post.location.provincia}</span>
                  </div>
                )}
                {post.location?.geo?.label && (
                  <div className="post-field">
                    <span className="post-field-label">Zona en el mapa:</span>
                    <span className="post-field-value">{post.location.geo.label}</span>
                  </div>
                )}
                {post.location?.municipioZona && (
                  <div className="post-field">
                    <span className="post-field-label">Zona / Ciudad / Barrio:</span>
                    <span className="post-field-value">{post.location.municipioZona}</span>
                  </div>
                )}
                {(post.street || post.location?.calleAproximada) && (
                  <div className="post-field">
                    <span className="post-field-label">Calle:</span>
                    <span className="post-field-value">
                      {post.location?.calleAproximada || post.street}
                      {post.city && !post.location?.municipioZona && `, ${post.city}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contenido (solo si existe) */}
          {post.content && post.content.trim() && (
            <div className="post-text">{post.content}</div>
          )}

          {/* Servicios y caracterÃ­sticas del espacio */}
          {activeServicios.length > 0 && (
            <div className="post-section">
              <h3 className="post-section-title">Servicios y características del Espacio</h3>
              <div className="post-section-content">
                <div className="servicios-chips">
                  {activeServicios.map((key, idx) => (
                    <span key={key || idx} className="servicio-chip">
                      {getServicioLabel(key)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Convivencia y anfitrión */}
          {post.anfitrion && (
            <div className="post-section">
              <h3 className="post-section-title">Convivencia y anfitrión</h3>
              <div className="post-section-content">
                {post.anfitrion.tieneVicios && (
                  <div className="post-field">
                    <span className="post-field-label">¿El anfitrión tiene vicios?</span>
                    <span className="post-field-value">
                      {getAnfitrionLabel('tieneVicios', post.anfitrion.tieneVicios)}
                    </span>
                  </div>
                )}
                {post.anfitrion.acoso && (
                  <div className="post-field">
                    <span className="post-field-label">¿Ha habido acoso?</span>
                    <span className="post-field-value">
                      {getAnfitrionLabel('acoso', post.anfitrion.acoso)}
                    </span>
                  </div>
                )}
                {post.anfitrion.caracter && (
                  <div className="post-field">
                    <span className="post-field-label">Carácter del anfitrión:</span>
                    <span className="post-field-value">
                      {getAnfitrionLabel('caracter', post.anfitrion.caracter)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Experiencia General */}
          <div className="post-section">
            <h3 className="post-section-title">Valoración del hilo</h3>
            {hasThreadRatings ? (
              <div className="post-section-content">
                <div className="post-field">
                  <span className="post-field-label">Confort:</span>
                  <span className="post-field-value">
                    <StarRating value={threadRatings.avgConfort} showValue />
                  </span>
                </div>
                <div className="post-field">
                  <span className="post-field-label">Seguridad:</span>
                  <span className="post-field-value">
                    <StarRating value={threadRatings.avgSeguridad} showValue />
                  </span>
                </div>
                <div className="post-field">
                  <span className="post-field-label">Media global:</span>
                  <span className="post-field-value">
                    <StarRating value={threadRatings.avgGlobal} showValue />
                  </span>
                </div>
                <div className="post-field">
                  <span className="post-field-label">Resumen:</span>
                  <span className="post-field-value">Basada en {threadRatings.count} valoraciones</span>
                </div>
              </div>
            ) : (
              <div className="post-section-content">
                <span className="post-field-value">Sin valoraciones todavía</span>
              </div>
            )}
          </div>

          {/* Bloque de Condiciones */}
          {(post.checkInOut || post.depositRequired !== undefined || post.cleaningFrequency) && (
            <div className="conditions-block">
              <h3 className="conditions-title">Condiciones</h3>
              <div className="conditions-content">
                {post.checkInOut && (
                  <div className="condition-field">
                    <span className="condition-label">Horario entrada/salida:</span>
                    <span className="condition-value">{post.checkInOut}</span>
                  </div>
                )}
                {post.depositRequired !== undefined && (
                  <div className="condition-field">
                    <span className="condition-label">Depósito requerido:</span>
                    <span className="condition-value">{post.depositRequired ? 'Sí' : 'No'}</span>
                  </div>
                )}
                {post.cleaningFrequency && (
                  <div className="condition-field">
                    <span className="condition-label">Frecuencia de limpieza:</span>
                    <span className="condition-value">{post.cleaningFrequency}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!post.isLocked && user && (
        <ReplyForm postId={id} onReplyAdded={handleReplyAdded} />
      )}
      
      {!post.isLocked && !user && (
        <div className="reply-form-card">
          <p>Debes <Link to="/login">iniciar sesión</Link> para añadir una experiencia</p>
        </div>
      )}

      <div className="replies-section">
        <h2>Experiencias ({post.replies?.filter(r => !r.isDeleted).length || 0})</h2>
        {post.replies && post.replies.length > 0 ? (
          post.replies
            .filter(reply => !reply?.isDeleted)
            .map((reply, idx) => {
              // Obtener servicios con fallback robusto
              const servicios = getReplyServicios(reply);

              return (
                <div key={reply?._id || `${reply?.author?._id || reply?.author || 'anon'}-${reply?.createdAt || idx}`} className="reply-card structured-reply">
                  <div className="reply-header">
                    <Link 
                      to={`/profile/${reply?.author?._id || reply?.author || ''}`} 
                      className="reply-author"
                    >
                      {reply?.author?.username || 'Usuario'}
                    </Link>
                    <span className="reply-date">
                      {reply?.createdAt ? new Date(reply.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Fecha no disponible'}
                    </span>
                  </div>
                  
                  {/* Mostrar datos estructurados */}
                  <div className="reply-structured-data">
                    {/* A) Servicios y caracterÃ­sticas */}
                    <div className="reply-section">
                      <div className="reply-section-title">Servicios y características del Espacio</div>
                      <div className="reply-amenities">
                        {servicios.length > 0 ? (
                          servicios.map((item, idx) => (
                            <span key={idx} className="amenity-badge">
                              {renderServicio(item, idx)}
                            </span>
                          ))
                        ) : (
                          <span className="no-specification">No especificado</span>
                        )}
                      </div>
                    </div>

                    {/* B) Convivencia y anfitrión */}
                    {reply?.anfitrion && (
                      <div className="reply-section">
                        <div className="reply-section-title">Convivencia y anfitrión</div>
                        <div className="reply-section-content">
                          {reply.anfitrion.tieneVicios && (
                            <div className="reply-field">
                              <span className="reply-field-label">¿El anfitrión tiene vicios?</span>
                              <span className="reply-field-value">
                                {getAnfitrionLabel('tieneVicios', reply.anfitrion.tieneVicios)}
                              </span>
                            </div>
                          )}
                          {reply.anfitrion.acoso && (
                            <div className="reply-field">
                              <span className="reply-field-label">¿Ha habido acoso?</span>
                              <span className="reply-field-value">
                                {getAnfitrionLabel('acoso', reply.anfitrion.acoso)}
                              </span>
                            </div>
                          )}
                          {reply.anfitrion.caracter && (
                            <div className="reply-field">
                              <span className="reply-field-label">Carácter del anfitrión:</span>
                              <span className="reply-field-value">
                                {getAnfitrionLabel('caracter', reply.anfitrion.caracter)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* C) Experiencia General */}
                    {reply?.experiencia && (reply.experiencia.confort || reply.experiencia.seguridadPercibida) && (
                      <div className="reply-section">
                        <div className="reply-section-title">Experiencia General</div>
                        <div className="reply-section-content">
                          {reply.experiencia.confort && (
                            <div className="reply-field">
                              <span className="reply-field-label">Confort:</span>
                              <span className="reply-field-value">
                                <StarRating value={reply.experiencia.confort} showValue />
                              </span>
                            </div>
                          )}
                          {reply.experiencia.seguridadPercibida && (
                            <div className="reply-field">
                              <span className="reply-field-label">Seguridad Percibida:</span>
                              <span className="reply-field-value">
                                <StarRating value={reply.experiencia.seguridadPercibida} showValue />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* D) Condiciones */}
                    {(reply?.checkInOut || reply?.depositRequired !== undefined || reply?.cleaningFrequency) && (
                      <div className="reply-conditions">
                        <div className="reply-conditions-title">Condiciones:</div>
                        {reply.checkInOut && (
                          <div className="reply-field">
                            <span className="reply-field-label">Horario entrada/salida:</span>
                            <span className="reply-field-value">{reply.checkInOut}</span>
                          </div>
                        )}
                        {reply.depositRequired !== undefined && (
                          <div className="reply-field">
                            <span className="reply-field-label">Depósito requerido:</span>
                            <span className="reply-field-value">{reply.depositRequired ? 'Sí' : 'No'}</span>
                          </div>
                        )}
                        {reply.cleaningFrequency && (
                          <div className="reply-field">
                            <span className="reply-field-label">Frecuencia de limpieza:</span>
                            <span className="reply-field-value">{reply.cleaningFrequency}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Compatibilidad: Comentario legacy */}
                    {reply?.content && (
                      <div className="reply-content legacy-content">
                        <div className="reply-content-label">Comentario:</div>
                        <div>{reply.content}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="reply-footer">
                    <div className="reply-votes">
                      <VoteButton
                        direction="up"
                        count={reply.votes?.upvotes?.length || 0}
                        active={reply.votes?.upvotes?.some((v) => v.toString() === user?.id)}
                        disabled={!user}
                        onClick={() => handleReplyVote(reply._id, 'upvote')}
                        label={user ? 'Votar positivo esta respuesta con pulgar arriba' : 'Inicia sesión para votar respuesta'}
                      />
                      <VoteButton
                        direction="down"
                        count={reply.votes?.downvotes?.length || 0}
                        active={reply.votes?.downvotes?.some((v) => v.toString() === user?.id)}
                        disabled={!user}
                        onClick={() => handleReplyVote(reply._id, 'downvote')}
                        label={user ? 'Votar negativo esta respuesta con pulgar abajo' : 'Inicia sesión para votar respuesta'}
                      />
                    </div>
                  </div>
                </div>
              );
            })
        ) : (
          <p className="no-replies">No hay experiencias aún. Sé el primero en añadir una experiencia.</p>
        )}
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        postId={id}
        initialEmail={user?.email || ''}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};

export default PostDetail;



