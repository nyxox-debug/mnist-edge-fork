# MNIST Edge Inference

**Autonomous Digit Recognition via Neural Inference**

<p align="center">
  <a href="https://mnist-edge-inference.vercel.app/">
    <img src="web_app/src/app/icon.png" alt="edge_inference" width="450" height="auto">
  </a>
</p>

A high-performance school project demonstrating the full lifecycle of a Machine Learning model: from training in a PyTorch environment to real-time browser-based deployment.

## Key Features

- **Edge Inference:** Runs entirely in the browser using **ONNX Runtime Web**. No backend latency.
- **PyTorch Optimized:** Model architecture designed and trained in Python/PyTorch before being serialized for web.
- **External Image Support:** Beyond the drawing canvas, users can upload images for direct neural processing.
- **Responsive Matrix UI:** Industrial, high-contrast dashboard built with **Next.js**, **Tailwind CSS**, and **TypeScript**.
- **Real-time Visualization:** Interactive canvas with live probability distribution plotting via **Recharts**.
- **Adversarial Testing:** Dynamic Gaussian noise and spatial rotation controls to stress-test model generalization.

## Adversarial Robustness & Generalization
This explorer demonstrates **Model Robustness** by exposing the CNN to "messy" real-world conditions:

1. **Gaussian Noise (SNR Test)**: Mimics electronic interference and low-light sensor grain. Tests if the model's feature maps can filter out random pixel fluctuations.
2. **Spatial Rotation (Generalization Test)**: Challenges the model’s spatial invariance. Verifies if the model understands digit topology rather than just fixed pixel coordinates.

### Implementation Pipeline
1. **Capture**: Extract raw 28x28 pixel data from the buffer.
2. **Perturb**: Apply affine transformation (Rotation) and inject Gaussian noise values.
3. **Normalize**: Rescale pixels to `[-1, 1]` or `[0, 1]` ranges for tensor compatibility.
4. **Inference**: Execute the ONNX session locally with the perturbed input.


## The Tech Stack

| Phase              | Technology                          |
| :----------------- | :---------------------------------- |
| **Model Training** | PyTorch, Jupyter, Torchvision       |
| **Serialization**  | ONNX (Open Neural Network Exchange) |
| **Frontend**       | Next.js 14, TypeScript              |
| **Deployment**     | Vercel                              |

## Pipeline Architecture

1.  **Train:** A Convolutional Neural Network (CNN) is trained on the MNIST dataset to **98%+ accuracy**.
2.  **Export:** The PyTorch `.pth` weights are converted to a `.onnx` graph with dynamic axes.
3.  **Deploy:** The model is served as a static asset in the `public/` directory.
4.  **Inference:** The TypeScript frontend captures canvas data, normalizes the tensor, and executes the ONNX session locally.

---

**Developed for Academic Evaluation - FUTO 2026**
