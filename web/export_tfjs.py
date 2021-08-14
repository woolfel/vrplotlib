import tensorflow as tf
import tensorflow.keras as keras
import tensorflowjs as tfjs
model = keras.applications.resnet.ResNet50()

tfjs.converters.save_keras_model(model, "./models/ResNet50")