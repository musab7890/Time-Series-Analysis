#!/usr/bin/env python
# coding: utf-8
import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np
import matplotlib.pyplot as plt
import cv2


# In[2]:


# In[3]:


# Function to load label map from .pbtxt
def load_label_map(pbtxt_path):
    label_map = {}
    class_name = ''
    class_id = ''
    with open(pbtxt_path, "r") as f:
        for line in f.readlines():
            if "display_name:" not in line and "name:" in line:
                class_name = line.strip().split(":")[1].replace('"', '').replace(",","").strip()
                
            if "id:" in line:
                class_id = int(line.strip().split(":")[1].replace(",",""))-1
                label_map[class_id] = class_name
    return label_map

# Load label map
label_map = load_label_map(LABEL_MAP_FILE)
num_classes = len(label_map)
print(f"num_classes: {num_classes}")
print("Label Map:", label_map)

# Function to parse TFRecord
def parse_tfrecord(example_proto):
    feature_description = {
        'image/encoded': tf.io.FixedLenFeature([], tf.string),
        'image/object/bbox/xmin': tf.io.VarLenFeature(tf.float32),
        'image/object/bbox/xmax': tf.io.VarLenFeature(tf.float32),
        'image/object/bbox/ymin': tf.io.VarLenFeature(tf.float32),
        'image/object/bbox/ymax': tf.io.VarLenFeature(tf.float32),
        'image/object/class/label': tf.io.VarLenFeature(tf.int64),
    }
    features = tf.io.parse_single_example(example_proto, feature_description)
    
    image = tf.io.decode_jpeg(features['image/encoded'], channels=3)
    image = tf.image.resize(image, (224, 224)) / 255.0
    
    xmin = tf.sparse.to_dense(features['image/object/bbox/xmin'])
    xmax = tf.sparse.to_dense(features['image/object/bbox/xmax'])
    ymin = tf.sparse.to_dense(features['image/object/bbox/ymin'])
    ymax = tf.sparse.to_dense(features['image/object/bbox/ymax'])
    bboxes = tf.stack([ymin, xmin, ymax, xmax], axis=1)
    labels = tf.sparse.to_dense(features['image/object/class/label'])
    
    has_objects = tf.greater(tf.size(labels), 0)
    default_bbox = tf.constant([0.0, 0.0, 0.0, 0.0], dtype=tf.float32)
    # Set default label to 0 (assuming 0 is the background or valid dummy label)
    default_label = tf.constant(0, dtype=tf.int64)
    
    bbox = tf.cond(has_objects,
                     lambda: bboxes[0],
                     lambda: default_bbox)
    label = tf.cond(has_objects,
                    lambda: labels[0] - 1,  # Subtract 1 to get labels 0-indexed
                    lambda: default_label)
    
    return image, (bbox, label)



# Load dataset function
def load_dataset(tfrecord_path, batch_size=32):
    raw_dataset = tf.data.TFRecordDataset(tfrecord_path)
    parsed_dataset = raw_dataset.map(parse_tfrecord)#.repeat()
    return parsed_dataset.shuffle(1000).batch(batch_size).prefetch(tf.data.AUTOTUNE)


# Load train, validation, and test datasets
print("Loading Data!!")
train_dataset = load_dataset(TRAIN_TFRECORD)
val_dataset = load_dataset(VAL_TFRECORD)
test_dataset = load_dataset(TEST_TFRECORD)

# Build a simple CNN model
print("Building!!")
inputs = tf.keras.Input(shape=(224, 224, 3))
x = tf.keras.layers.Conv2D(32, (3, 3), activation='relu')(inputs)
x = tf.keras.layers.MaxPooling2D((2, 2))(x)
x = tf.keras.layers.Conv2D(64, (3, 3), activation='relu')(x)
x = tf.keras.layers.MaxPooling2D((2, 2))(x)
x = tf.keras.layers.Conv2D(128, (3, 3), activation='relu')(x)
x = tf.keras.layers.MaxPooling2D((2, 2))(x)
x = tf.keras.layers.Flatten()(x)
x = tf.keras.layers.Dense(128, activation='relu')(x)

# Bounding box regression head (4 values)
bbox_output = tf.keras.layers.Dense(4, name='bbox')(x)

# Classification head (num_classes values)
class_output = tf.keras.layers.Dense(num_classes, activation='softmax', name='classification')(x)

model = tf.keras.Model(inputs=inputs, outputs=[bbox_output, class_output])



# Compile the model
print("Compiling!!")
model.compile(
    optimizer='adam',
    loss={'bbox': 'mse', 'classification': 'sparse_categorical_crossentropy'},
    metrics={'classification': 'accuracy'}
)


# Train the model
print("Fitting!!")
model.fit(train_dataset, validation_data=val_dataset, epochs=10, steps_per_epoch=100)

# Evaluate on test set
loss, bbox_loss, class_loss, class_accuracy = model.evaluate(test_dataset)
print(f"Test Loss: {loss:.4f}, Classification Accuracy: {class_accuracy:.4f}")


# Save the model
model.save("image_classifier.h5")


# In[5]:


def predict_image(model_path, image_path):
    # Load model
    model = tf.keras.models.load_model(
        model_path,
        custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
    )

    # Load image
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)  # Convert BGR to RGB
    image = cv2.resize(image, (224, 224)) / 255.0     # Resize & normalize
    image = np.expand_dims(image, axis=0)             # Add batch dimension

    # Predict: model outputs [bbox, classification]
    bbox_pred, class_pred = model.predict(image)
    predicted_class = np.argmax(class_pred, axis=-1)[0]

    # Map to class name
    class_name = label_map.get(predicted_class, "Unknown")
    print(f"Predicted Class: {class_name}")


# Example usage:
predict_image("image_classifier.h5", "test.png")


# In[10]:


def predict_and_display_image(model_path, image_path, label_map):
    # Load the model
    model = tf.keras.models.load_model(model_path, custom_objects={'mse': tf.keras.losses.MeanSquaredError()})
    
    # Load and preprocess the image
    orig_image = cv2.imread(image_path)
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(orig_image, cv2.COLOR_BGR2RGB)
    # Resize and normalize
    image_resized = cv2.resize(image_rgb, (224, 224)) / 255.0
    input_image = np.expand_dims(image_resized, axis=0)
    
    # Predict: assume model outputs (bbox, class)
    bbox_pred, class_pred = model.predict(input_image)
    predicted_class = np.argmax(class_pred)
    class_name = label_map.get(predicted_class, "Unknown")
    
    # Assume bbox_pred is in normalized coordinates [ymin, xmin, ymax, xmax] for the resized image
    h_orig, w_orig, _ = orig_image.shape
    # Scale bbox back to the original image dimensions:
    ymin = int(bbox_pred[0][0] * h_orig)
    xmin = int(bbox_pred[0][1] * w_orig)
    ymax = int(bbox_pred[0][2] * h_orig)
    xmax = int(bbox_pred[0][3] * w_orig)
    
    # Draw bounding box and label on a copy of the original image
    image_with_box = orig_image.copy()
    cv2.rectangle(image_with_box, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)
    cv2.putText(image_with_box, class_name, (xmin, ymin - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)
    
    # Convert BGR (OpenCV) to RGB for displaying with matplotlib
    image_display = cv2.cvtColor(image_with_box, cv2.COLOR_BGR2RGB)
    
    plt.figure(figsize=(8,6))
    plt.imshow(image_display)
    plt.axis("off")
    plt.show()

predict_and_display_image("image_classifier.h5", "test.png", label_map)
