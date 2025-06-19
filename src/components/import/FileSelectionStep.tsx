// src/components/import/FileSelectionStep.tsx
import React, {useState} from 'react';
import {Alert, Button, Card, Col, Modal, Row, Space, Statistic, Typography, Upload} from 'antd';
import {CheckCircleOutlined, DeleteOutlined, FileTextOutlined, InfoCircleOutlined} from '@ant-design/icons';
import {RcFile} from 'antd/lib/upload';
import {ImportWizardData} from '../../pages/EnhancedCsvImportPage';

const {Title, Text, Paragraph} = Typography;
const {Dragger} = Upload;

interface FileSelectionStepProps {
    wizardData: ImportWizardData;
    updateWizardData: (updates: Partial<ImportWizardData>) => void;
    onNext: () => void;
}

const FileSelectionStep: React.FC<FileSelectionStepProps> = ({
                                                                 wizardData,
                                                                 updateWizardData,
                                                                 onNext
                                                             }) => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [filePreview, setFilePreview] = useState<string>('');

    // Validation du fichier
    const validateFile = (file: RcFile): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Vérifier l'extension
        const allowedExtensions = ['.csv', '.xls', '.xlsx'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
            errors.push(`Extension non supportée: ${fileExtension}. Extensions autorisées: ${allowedExtensions.join(', ')}`);
        }

        // Vérifier la taille (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            errors.push(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB. Taille maximale: 10MB`);
        }

        // Vérifier que le fichier n'est pas vide
        if (file.size === 0) {
            errors.push('Le fichier est vide');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    // Gestionnaire de changement de fichier
    const handleFileChange = (info: any) => {
        let fileToUse: RcFile | null = null;

        // Extraire le fichier de différentes structures possibles
        if (info.file instanceof File) {
            fileToUse = info.file;
        } else if (info.file.originFileObj) {
            fileToUse = info.file.originFileObj;
        } else if (info.fileList && info.fileList.length > 0) {
            const lastFile = info.fileList[info.fileList.length - 1];
            if (lastFile.originFileObj) {
                fileToUse = lastFile.originFileObj;
            } else if (lastFile instanceof File) {
                fileToUse = lastFile;
            }
        }

        if (fileToUse) {
            // Valider le fichier
            const validation = validateFile(fileToUse);

            // Lire le contenu du fichier
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                updateWizardData({
                    selectedFile: fileToUse,
                    fileContent: content,
                    fileValidation: validation
                });
            };

            reader.onerror = () => {
                updateWizardData({
                    selectedFile: fileToUse,
                    fileContent: '',
                    fileValidation: {
                        isValid: false,
                        errors: [...validation.errors, 'Erreur lors de la lecture du fichier']
                    }
                });
            };

            try {
                reader.readAsText(fileToUse);
            } catch (error) {
                updateWizardData({
                    selectedFile: fileToUse,
                    fileContent: '',
                    fileValidation: {
                        isValid: false,
                        errors: [...validation.errors, 'Impossible de lire le fichier']
                    }
                });
            }
        } else {
            // Réinitialiser si aucun fichier valide
            updateWizardData({
                selectedFile: null,
                fileContent: '',
                fileValidation: {isValid: false, errors: []}
            });
        }
    };

    // Prévisualiser le contenu du fichier
    const previewFile = () => {
        if (wizardData.fileContent) {
            const lines = wizardData.fileContent.split('\n').slice(0, 10);
            setFilePreview(lines.join('\n'));
            setPreviewVisible(true);
        }
    };

    // Supprimer le fichier sélectionné
    const removeFile = () => {
        updateWizardData({
            selectedFile: null,
            fileContent: '',
            fileValidation: {isValid: false, errors: []}
        });
    };

    // Convertir le type MIME en nom lisible
    const getReadableFileType = (file: File): string => {
        const mimeType = file.type;
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        // Priorité à l'extension si le type MIME est complexe
        switch (extension) {
            case '.xlsx':
            case '.xls':
                return 'Excel';
            case '.csv':
                return 'CSV';
            default:
                // Fallback sur le type MIME si nécessaire
                switch (mimeType) {
                    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                        return 'Excel';
                    case 'application/vnd.ms-excel':
                        return 'Excel';
                    case 'text/csv':
                        return 'CSV';
                    default:
                        return mimeType || 'Non spécifié';
                }
        }
    };

    // Obtenir les informations du fichier pour l'affichage
    const getFileInfo = () => {
        if (!wizardData.selectedFile) return null;

        const file = wizardData.selectedFile;
        return {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            type: getReadableFileType(file),
            lastModified: new Date(file.lastModified).toLocaleString()
        };
    };

    const fileInfo = getFileInfo();

    return (
        <Card title="1. Sélection du fichier CSV/Excel" style={{width: '100%'}}>
            <Space direction="vertical" size={16} style={{width: '100%'}}>
                {!wizardData.selectedFile ? (
                    <Dragger
                        accept=".csv,.xls,.xlsx"
                        beforeUpload={() => false} // Empêche l'upload automatique
                        onChange={handleFileChange}
                        maxCount={1}
                        showUploadList={false}
                        style={{padding: '40px 20px'}}
                    >
                        <p className="ant-upload-drag-icon">
                            <FileTextOutlined style={{fontSize: 64, color: '#1890ff'}}/>
                        </p>
                        <p className="ant-upload-text" style={{fontSize: '18px', fontWeight: 'bold'}}>
                            Cliquez ou glissez-déposez votre fichier ici
                        </p>
                        <p className="ant-upload-hint" style={{fontSize: '14px'}}>
                            Formats supportés : CSV, Excel (.xls, .xlsx)<br/>
                            Taille maximale : 10 MB
                        </p>
                    </Dragger>
                ) : (
                    <div>
                        {/* Informations du fichier sélectionné */}
                        <Alert
                            type={wizardData.fileValidation.isValid ? "success" : "error"}
                            showIcon
                            message={wizardData.fileValidation.isValid ? "Fichier valide sélectionné" : "Fichier invalide"}
                            description={
                                wizardData.fileValidation.isValid ? (
                                    <div>
                                        <strong>{fileInfo?.name}</strong> est prêt pour l'import
                                    </div>
                                ) : (
                                    <div>
                                        <div>Erreurs détectées :</div>
                                        <ul style={{marginTop: 8, marginBottom: 0}}>
                                            {wizardData.fileValidation.errors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            }
                            action={
                                <Space>
                                    <Button size="small" onClick={removeFile} icon={<DeleteOutlined/>}>
                                        Supprimer
                                    </Button>
                                    {wizardData.fileValidation.isValid && (
                                        <Button size="small" onClick={previewFile} icon={<InfoCircleOutlined/>}>
                                            Aperçu
                                        </Button>
                                    )}
                                </Space>
                            }
                            style={{marginBottom: 16}}
                        />

                        {/* Détails du fichier */}
                        {fileInfo && (
                            <Card size="small" title="Détails du fichier">
                                <Row gutter={16}>
                                    <Col span={6}>
                                        <Statistic title="Nom" value={fileInfo.name}/>
                                    </Col>
                                    <Col span={6}>
                                        <Statistic title="Taille" value={fileInfo.size}/>
                                    </Col>
                                    <Col span={6}>
                                        <Statistic title="Type" value={fileInfo.type}/>
                                    </Col>
                                    <Col span={6}>
                                        <Statistic title="Modifié le" value={fileInfo.lastModified}/>
                                    </Col>
                                </Row>
                            </Card>
                        )}
                    </div>
                )}

                {/* Actions */}
                {wizardData.selectedFile && wizardData.fileValidation.isValid && (
                    <div style={{textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0'}}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={onNext}
                            icon={<CheckCircleOutlined/>}
                        >
                            Continuer vers la configuration
                        </Button>
                    </div>
                )}
            </Space>

            {/* Modal de prévisualisation */}
            <Modal
                title="Aperçu du fichier (10 premières lignes)"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setPreviewVisible(false)}>
                        Fermer
                    </Button>
                ]}
                width={800}
            >
                <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    fontSize: '12px',
                    lineHeight: '1.4'
                }}>
                    {filePreview}
                </pre>
            </Modal>
        </Card>
    );
};

export default FileSelectionStep;